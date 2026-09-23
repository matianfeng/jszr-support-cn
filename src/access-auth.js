const CERT_CACHE_TTL_MS = 60 * 60 * 1000;
let certificateCache = null;

function normalizeTeamDomain(value) {
  if (!value) return null;
  const trimmed = String(value).trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  if (!/^[a-z0-9.-]+\.cloudflareaccess\.com$/i.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function getCertificates(teamDomain) {
  const now = Date.now();
  if (certificateCache?.teamDomain === teamDomain && certificateCache.expiresAt > now) {
    return certificateCache.keys;
  }
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Access certificate request failed: ${response.status}`);
  const document = await response.json();
  const keys = Array.isArray(document.keys) ? document.keys : [];
  if (!keys.length) throw new Error('Access certificate response contained no keys');
  certificateCache = { teamDomain, keys, expiresAt: now + CERT_CACHE_TTL_MS };
  return keys;
}

function audienceMatches(claim, expected) {
  return Array.isArray(claim) ? claim.includes(expected) : claim === expected;
}

export async function verifyAccessRequest(request, env) {
  const teamDomain = normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN);
  const audience = typeof env.ACCESS_AUD === 'string' ? env.ACCESS_AUD.trim() : '';
  if (!teamDomain || !audience) {
    return { ok: false, status: 403, message: 'Admin access is not configured' };
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return { ok: false, status: 401, message: 'Cloudflare Access authentication required' };

  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed token');
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported token header');
    const keys = await getCertificates(teamDomain);
    const jwk = keys.find((candidate) => candidate.kid === header.kid);
    if (!jwk) throw new Error('Unknown signing key');
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
    );
    const validSignature = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    const now = Math.floor(Date.now() / 1000);
    const issuer = `https://${teamDomain}`;
    if (!validSignature || payload.iss !== issuer || !audienceMatches(payload.aud, audience)) {
      throw new Error('Token claims are invalid');
    }
    if (!Number.isFinite(payload.exp) || payload.exp <= now || (payload.nbf && payload.nbf > now + 30)) {
      throw new Error('Token is expired or not active');
    }
    return {
      ok: true,
      identity: {
        subject: typeof payload.sub === 'string' ? payload.sub : null,
        email: typeof payload.email === 'string' ? payload.email : null,
      },
    };
  } catch (cause) {
    console.warn('Cloudflare Access JWT verification failed', cause instanceof Error ? cause.message : 'unknown');
    return { ok: false, status: 401, message: 'Invalid Cloudflare Access identity' };
  }
}
