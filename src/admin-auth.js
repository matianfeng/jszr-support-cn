const COOKIE_NAME = 'admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const LOGIN_BODY_LIMIT = 8 * 1024;
const MAX_USERNAME_LENGTH = 128;
const MAX_PASSWORD_LENGTH = 1024;
const encoder = new TextEncoder();

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64Decode(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64Encode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(left, right) {
  const max = Math.max(left.length, right.length);
  let different = left.length ^ right.length;
  for (let index = 0; index < max; index += 1) different |= (left[index] || 0) ^ (right[index] || 0);
  return different === 0;
}

function configured(env) {
  return Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD_HASH && env.ADMIN_SESSION_SECRET);
}

function parsePasswordHash(value) {
  const parts = String(value || '').split(':');
  if (parts.length !== 5 || parts[0] !== 'v1' || parts[1] !== 'pbkdf2-sha256') return null;
  const iterations = Number(parts[2]);
  if (!Number.isSafeInteger(iterations) || iterations < 100000 || iterations > 100000) return null;
  try {
    const salt = base64Decode(parts[3]);
    const hash = base64Decode(parts[4]);
    if (salt.length < 16 || hash.length < 32) return null;
    return { iterations, salt, hash };
  } catch { return null; }
}

async function derivePassword(password, salt, iterations, length = 32) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, length * 8);
  return new Uint8Array(bits);
}

export async function generatePasswordHash(password, iterations = 100000, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const derived = await derivePassword(password, salt, iterations);
  return `v1:pbkdf2-sha256:${iterations}:${base64Encode(salt)}:${base64Encode(derived)}`;
}

async function verifyPassword(password, stored) {
  const parsed = parsePasswordHash(stored);
  if (!parsed) return false;
  const derived = await derivePassword(password, parsed.salt, parsed.iterations, parsed.hash.length);
  return constantTimeEqual(derived, parsed.hash);
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function createSession(username, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload = {
    v: 1, username, iat: nowSeconds, exp: nowSeconds + SESSION_SECONDS,
    jti: crypto.randomUUID(), csrf: base64UrlEncode(crypto.getRandomValues(new Uint8Array(24))),
  };
  const encoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = base64UrlEncode(await hmac(secret, encoded));
  return { token: `${encoded}.${signature}`, payload };
}

function readCookie(request, name = COOKIE_NAME) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > -1 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

export async function verifyAdminSession(request, env, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!configured(env)) return { ok: false, configured: false };
  const token = readCookie(request);
  if (!token) return { ok: false, configured: true };
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { ok: false, configured: true };
    const expected = await hmac(env.ADMIN_SESSION_SECRET, parts[0]);
    const supplied = base64UrlDecode(parts[1]);
    if (!constantTimeEqual(expected, supplied)) return { ok: false, configured: true };
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
    if (payload.v !== 1 || payload.username !== env.ADMIN_USERNAME || !payload.jti || !payload.csrf) return { ok: false, configured: true };
    if (!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.iat > nowSeconds + 60 || payload.exp <= nowSeconds) return { ok: false, configured: true };
    return { ok: true, configured: true, username: payload.username, csrfToken: payload.csrf, expiresAt: payload.exp };
  } catch { return { ok: false, configured: true }; }
}

function apiJson(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}

function authError(code, message, status) {
  return apiJson({ success: false, error: { code, message } }, status);
}

function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function verifyOrigin(request) {
  const origin = request.headers.get('Origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

export function verifyCsrf(request, session) {
  const supplied = request.headers.get('X-CSRF-Token') || '';
  const left = encoder.encode(supplied);
  const right = encoder.encode(session.csrfToken || '');
  return supplied.length > 0 && constantTimeEqual(left, right);
}

async function rateLimitLogin(request, env) {
  if (!env.LOGIN_RATE_LIMITER?.limit) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    return true;
  }
  try {
    const client = request.headers.get('CF-Connecting-IP') || 'unknown-client';
    const result = await env.LOGIN_RATE_LIMITER.limit({ key: `admin-login:${client}` });
    return result.success;
  } catch (cause) {
    console.error('Login rate limiter unavailable', { reason: cause instanceof Error ? cause.message : 'unknown' });
    await new Promise((resolve) => setTimeout(resolve, 750));
    return true;
  }
}

async function login(request, env) {
  if (request.method !== 'POST') return authError('METHOD_NOT_ALLOWED', '请求方法不允许', 405);
  if (!configured(env)) return authError('AUTH_NOT_CONFIGURED', '后台认证尚未配置', 503);
  if (!verifyOrigin(request)) return authError('ORIGIN_INVALID', '请求来源校验失败', 403);
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return authError('CONTENT_TYPE_INVALID', '请求必须使用application/json', 415);
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > LOGIN_BODY_LIMIT) return authError('REQUEST_TOO_LARGE', '请求体过大', 413);
  if (!(await rateLimitLogin(request, env))) return authError('RATE_LIMITED', '登录尝试过于频繁，请稍后再试', 429);
  let body;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > LOGIN_BODY_LIMIT) return authError('REQUEST_TOO_LARGE', '请求体过大', 413);
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return authError('INVALID_REQUEST', '请求参数错误', 400); }
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password || username.length > MAX_USERNAME_LENGTH || password.length > MAX_PASSWORD_LENGTH) return authError('INVALID_CREDENTIALS', '账号或密码错误', 401);
  const usernameMatches = constantTimeEqual(encoder.encode(username), encoder.encode(env.ADMIN_USERNAME));
  let passwordMatches;
  try { passwordMatches = await verifyPassword(password, env.ADMIN_PASSWORD_HASH); }
  catch (cause) {
    console.error('Password verification unavailable', { reason: cause instanceof Error ? cause.message : 'unknown' });
    return authError('AUTH_CRYPTO_UNAVAILABLE', '认证服务暂时不可用', 500);
  }
  if (!usernameMatches || !passwordMatches) {
    console.warn('Admin login failed', { client: request.headers.get('CF-Ray') || 'local' });
    return authError('INVALID_CREDENTIALS', '账号或密码错误', 401);
  }
  let session;
  try { session = await createSession(env.ADMIN_USERNAME, env.ADMIN_SESSION_SECRET); }
  catch (cause) {
    console.error('Session signing unavailable', { reason: cause instanceof Error ? cause.message : 'unknown' });
    return authError('SESSION_SIGNING_UNAVAILABLE', '认证服务暂时不可用', 500);
  }
  console.info('Admin login succeeded', { client: request.headers.get('CF-Ray') || 'local' });
  return apiJson({ success: true, data: { username: env.ADMIN_USERNAME, csrfToken: session.payload.csrf } }, 200, { 'Set-Cookie': sessionCookie(session.token) });
}

async function logout(request, env) {
  if (request.method !== 'POST') return authError('METHOD_NOT_ALLOWED', '请求方法不允许', 405);
  const session = await verifyAdminSession(request, env);
  if (!session.ok) return authError('AUTH_REQUIRED', '请先登录', 401);
  if (!verifyOrigin(request) || !verifyCsrf(request, session)) return authError('CSRF_INVALID', '安全校验失败', 403);
  console.info('Admin logged out');
  return apiJson({ success: true, data: {} }, 200, { 'Set-Cookie': clearCookie() });
}

async function me(request, env) {
  if (request.method !== 'GET') return authError('METHOD_NOT_ALLOWED', '请求方法不允许', 405);
  const session = await verifyAdminSession(request, env);
  if (!session.ok) return authError(session.configured ? 'AUTH_REQUIRED' : 'AUTH_NOT_CONFIGURED', session.configured ? '请先登录' : '后台认证尚未配置', session.configured ? 401 : 503);
  return apiJson({ success: true, data: { username: session.username, csrfToken: session.csrfToken } });
}

export async function handleAuthApi(request, env, pathname) {
  try {
    if (pathname === '/api/admin/auth/login') return await login(request, env);
    if (pathname === '/api/admin/auth/logout') return await logout(request, env);
    if (pathname === '/api/admin/auth/me') return await me(request, env);
    return authError('NOT_FOUND', '认证接口不存在', 404);
  } catch (cause) {
    console.error('Admin authentication request failed', { route: pathname, reason: cause instanceof Error ? cause.message : 'unknown' });
    return authError('INTERNAL_ERROR', '认证服务暂时不可用', 500);
  }
}
