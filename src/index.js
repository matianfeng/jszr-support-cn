import '../public/data/categories.js';
import { handleAuthApi, verifyAdminSession, verifyCsrf, verifyOrigin } from './admin-auth.js';
import { handleAdminApi } from './admin-api.js';

const VALID_CATEGORIES = new Set(
  globalThis.SUPPORT_CATEGORIES
    .filter((node) => node.node_type === 'category')
    .map((node) => node.category_key),
);

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function error(message, status, headers) {
  return json({ success: false, error: message }, status, headers);
}

function safeDisposition(fileName, download) {
  const original = (fileName || 'resource-file').replace(/[\r\n]/g, '').slice(0, 240);
  const ascii = original.replace(/[^\x20-\x7e]/g, '_').replace(/[\\/";]/g, '_') || 'resource-file';
  const encoded = encodeURIComponent(original).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function listResources(request, env) {
  if (request.method !== 'GET') return error('Method not allowed', 405, { Allow: 'GET' });
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const lang = url.searchParams.get('lang') || 'zh-CN';
  if (!category) return error('category is required', 400);
  if (!VALID_CATEGORIES.has(category)) return error('Invalid category', 400);
  if (!['zh-CN', 'en'].includes(lang)) return error('lang must be zh-CN or en', 400);

  const localizedFields = lang === 'en'
    ? "COALESCE(NULLIF(title_en, ''), title_zh) AS title, COALESCE(NULLIF(summary_en, ''), summary_zh) AS summary"
    : 'title_zh AS title, summary_zh AS summary';
  const statement = env.DB.prepare(`
    SELECT
      id, category_key, product_key, resource_type,
      ${localizedFields},
      version, language, file_name, file_size, mime_type,
      CASE WHEN r2_key IS NOT NULL AND length(trim(r2_key)) > 0 THEN 1 ELSE 0 END AS has_file,
      CASE WHEN external_url IS NOT NULL AND length(trim(external_url)) > 0 THEN 1 ELSE 0 END AS has_external_url,
      external_url, published_at
    FROM resources
    WHERE category_key = ? AND status = ?
    ORDER BY sort_order ASC, published_at DESC, id DESC
  `).bind(category, 'published');
  const result = await statement.all();
  const data = (result.results || []).map((row) => {
    const externalUrl = safeExternalUrl(row.external_url);
    return {
      ...row,
      has_file: Boolean(row.has_file),
      has_external_url: Boolean(row.has_external_url) && Boolean(externalUrl),
      external_url: externalUrl,
    };
  });
  return json({ success: true, data, count: data.length });
}

async function readResourceFile(request, env, id) {
  if (request.method !== 'GET') return error('Method not allowed', 405, { Allow: 'GET' });
  const resource = await env.DB.prepare(`
    SELECT id, r2_key, file_name, mime_type
    FROM resources
    WHERE id = ? AND status = ?
    LIMIT 1
  `).bind(Number(id), 'published').first();
  if (!resource) return error('Resource not found', 404);
  if (!resource.r2_key) return error('File not found', 404);

  const object = await env.SUPPORT_FILES.get(resource.r2_key);
  if (!object) return error('File not found', 404);
  const url = new URL(request.url);
  const headers = new Headers();
  headers.set('Content-Type', resource.mime_type || object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Content-Length', String(object.size));
  headers.set('Content-Disposition', safeDisposition(resource.file_name, url.searchParams.get('download') === '1'));
  headers.set('X-Content-Type-Options', 'nosniff');
  if (object.httpEtag) headers.set('ETag', object.httpEtag);
  return new Response(object.body, { status: 200, headers });
}

async function handleApi(request, env, pathname) {
  try {
    if (pathname === '/api/resources') return await listResources(request, env);
    const fileMatch = pathname.match(/^\/api\/resources\/(\d+)\/file$/);
    if (fileMatch) return await readResourceFile(request, env, fileMatch[1]);
    return error('API route not found', 404);
  } catch (cause) {
    console.error('Public API request failed', cause);
    return error('Internal server error', 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/index.html') {
      const session = await verifyAdminSession(request, env);
      if (!session.ok) return Response.redirect(`${url.origin}/admin/login?next=%2Fadmin%2F`, 302);
      return env.ASSETS.fetch(pathname === '/admin/' ? request : new Request(`${url.origin}/admin/`, request));
    }
    if (pathname === '/admin/login' || pathname === '/admin/login/' || pathname === '/admin/login.html') {
      const session = await verifyAdminSession(request, env);
      if (session.ok) return Response.redirect(`${url.origin}/admin/`, 302);
      return env.ASSETS.fetch(pathname === '/admin/login' ? request : new Request(`${url.origin}/admin/login`, request));
    }
    if (pathname.startsWith('/api/admin/')) {
      if (pathname.startsWith('/api/admin/auth/')) return handleAuthApi(request, env, pathname);
      const session = await verifyAdminSession(request, env);
      if (!session.ok) return json({ success: false, error: { code: session.configured ? 'AUTH_REQUIRED' : 'AUTH_NOT_CONFIGURED', message: session.configured ? '请先登录' : '后台认证尚未配置' } }, session.configured ? 401 : 503);
      if (!['GET', 'HEAD'].includes(request.method) && (!verifyOrigin(request) || !verifyCsrf(request, session))) {
        return json({ success: false, error: { code: 'CSRF_INVALID', message: '安全校验失败' } }, 403);
      }
      request.adminIdentity = { username: session.username };
      return handleAdminApi(request, env, pathname);
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return handleApi(request, env, pathname);
    }
    return env.ASSETS.fetch(request);
  },
};
