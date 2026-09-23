import '../public/data/categories.js';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const VALID_CATEGORIES = new Set(globalThis.SUPPORT_CATEGORIES.filter((node) => node.node_type === 'category').map((node) => node.category_key));
const PRODUCT_KEYS = new Set(['yingao', 'tieao']);
const STATUSES = new Set(['draft', 'published', 'unpublished']);
const RESOURCE_TYPES = new Set(['document', 'sdk', 'firmware', 'video', 'faq', 'tool', 'link']);
const LANGUAGES = new Set(['zh-CN', 'en', 'bilingual']);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'bin', 'fw', 'img', 'hex', 'deb', 'rpm', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf', 'application/zip', 'application/x-7z-compressed', 'application/vnd.rar',
  'application/x-rar-compressed', 'application/x-tar', 'application/gzip', 'application/octet-stream',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime', 'application/vnd.debian.binary-package', 'application/x-rpm',
]);
const GENERIC_MIME_EXTENSIONS = new Set(['zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'bin', 'fw', 'img', 'hex', 'deb', 'rpm']);

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}

function fail(message, status = 400, code = 'invalid_request') {
  return json({ success: false, error: { code, message } }, status);
}

function cleanText(value, maxLength, required = false) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw new Error('required');
  if (text.length > maxLength) throw new Error('too_long');
  return text || null;
}

function safeExternalUrl(value) {
  const text = cleanText(value, 2048);
  if (!text) return null;
  const url = new URL(text);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid_url');
  return url.href;
}

function parseInteger(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < -1000000 || number > 1000000) throw new Error('invalid_integer');
  return number;
}

function validateCategory(productKey, categoryKey) {
  return PRODUCT_KEYS.has(productKey) && VALID_CATEGORIES.has(categoryKey) && categoryKey.startsWith(`${productKey}.`);
}

function fileExtension(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

export function validateUpload(file) {
  if (!(file instanceof File) || !file.name) throw Object.assign(new Error('请选择有效文件'), { status: 400, code: 'invalid_file' });
  if (file.size === 0) throw Object.assign(new Error('不能上传空文件'), { status: 400, code: 'empty_file' });
  if (file.size > MAX_UPLOAD_BYTES) throw Object.assign(new Error('文件不能超过100MB'), { status: 413, code: 'file_too_large' });
  if (file.name.length > 240 || /[\u0000-\u001f\u007f]/.test(file.name)) throw Object.assign(new Error('文件名不合法'), { status: 400, code: 'invalid_filename' });
  const extension = fileExtension(file.name);
  const mime = String(file.type || 'application/octet-stream').toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.has(mime) || (mime === 'application/octet-stream' && GENERIC_MIME_EXTENSIONS.has(extension));
  if (!ALLOWED_EXTENSIONS.has(extension) || !mimeAllowed) throw Object.assign(new Error('不支持该文件类型'), { status: 415, code: 'unsupported_file_type' });
  return { extension, mime };
}

function safeFileName(name) {
  const extension = fileExtension(name);
  const base = String(name).replace(/\.[^.]+$/, '').normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'file';
  return `${base}.${extension}`;
}

export function createObjectKey(categoryKey, fileName, uuid = crypto.randomUUID()) {
  return `${categoryKey.split('.').join('/')}/${uuid}-${safeFileName(fileName)}`;
}

function publicRecord(row) {
  return {
    id: row.id, category_key: row.category_key, product_key: row.product_key, resource_type: row.resource_type,
    title_zh: row.title_zh, title_en: row.title_en, summary_zh: row.summary_zh, summary_en: row.summary_en,
    version: row.version, language: row.language, external_url: row.external_url, file_name: row.file_name,
    file_size: row.file_size, mime_type: row.mime_type, has_file: Boolean(row.r2_key), status: row.status,
    sort_order: row.sort_order, published_at: row.published_at, created_at: row.created_at, updated_at: row.updated_at,
  };
}

function parseFields(form, existing = null) {
  const productKey = cleanText(form.get('product_key'), 20, true);
  const categoryKey = cleanText(form.get('category_key'), 120, true);
  const resourceType = cleanText(form.get('resource_type'), 30, true);
  const status = cleanText(form.get('status'), 20) || existing?.status || 'draft';
  if (!validateCategory(productKey, categoryKey)) throw Object.assign(new Error('产品与末级栏目不匹配'), { code: 'invalid_category' });
  if (!RESOURCE_TYPES.has(resourceType)) throw Object.assign(new Error('资料类型不合法'), { code: 'invalid_resource_type' });
  if (!STATUSES.has(status)) throw Object.assign(new Error('状态不合法'), { code: 'invalid_status' });
  const language = cleanText(form.get('language'), 20) || 'zh-CN';
  if (!LANGUAGES.has(language)) throw Object.assign(new Error('资料语言不合法'), { code: 'invalid_language' });
  let titleZh;
  try { titleZh = cleanText(form.get('title_zh'), 300, true); } catch { throw Object.assign(new Error('中文标题不能为空且不能超过300字'), { code: 'invalid_title' }); }
  let externalUrl;
  try { externalUrl = safeExternalUrl(form.get('external_url')); } catch { throw Object.assign(new Error('外部链接必须是HTTP或HTTPS地址'), { code: 'invalid_url' }); }
  return {
    productKey, categoryKey, resourceType, status, language, titleZh, externalUrl,
    titleEn: cleanText(form.get('title_en'), 300), summaryZh: cleanText(form.get('summary_zh'), 4000),
    summaryEn: cleanText(form.get('summary_en'), 4000), version: cleanText(form.get('version'), 100),
    sortOrder: parseInteger(form.get('sort_order')),
  };
}

async function parseMultipart(request) {
  const type = request.headers.get('Content-Type') || '';
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > MAX_UPLOAD_BYTES + 1024 * 1024) throw Object.assign(new Error('请求体过大'), { status: 413, code: 'request_too_large' });
  if (!type.toLowerCase().startsWith('multipart/form-data')) throw Object.assign(new Error('请求必须使用multipart/form-data'), { status: 400, code: 'invalid_content_type' });
  return request.formData();
}

async function findResource(env, id) {
  return env.DB.prepare('SELECT * FROM resources WHERE id = ? LIMIT 1').bind(id).first();
}

async function listResources(request, env) {
  const url = new URL(request.url);
  const where = [];
  const values = [];
  const product = url.searchParams.get('product');
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const keyword = url.searchParams.get('keyword')?.trim();
  if (product) { if (!PRODUCT_KEYS.has(product)) return fail('产品筛选值不合法'); where.push('product_key = ?'); values.push(product); }
  if (category) { if (!VALID_CATEGORIES.has(category)) return fail('栏目筛选值不合法'); where.push('category_key = ?'); values.push(category); }
  if (status) { if (!STATUSES.has(status)) return fail('状态筛选值不合法'); where.push('status = ?'); values.push(status); }
  if (keyword) { where.push('(title_zh LIKE ? OR title_en LIKE ? OR summary_zh LIKE ? OR summary_en LIKE ?)'); const term = `%${keyword.slice(0, 100)}%`; values.push(term, term, term, term); }
  const sql = `SELECT * FROM resources ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC, id DESC LIMIT 500`;
  const result = await env.DB.prepare(sql).bind(...values).all();
  const data = (result.results || []).map(publicRecord);
  return json({ success: true, data, count: data.length });
}

export async function createResource(request, env) {
  let uploadedKey = null;
  try {
    const form = await parseMultipart(request);
    const fields = parseFields(form);
    const file = form.get('file');
    const hasFile = file instanceof File && Boolean(file.name);
    if (!hasFile && !fields.externalUrl) return fail('文件和外部链接至少需要填写一个', 400, 'missing_content');
    let fileData = { key: null, name: null, size: null, mime: null };
    if (hasFile) {
      const checked = validateUpload(file);
      uploadedKey = createObjectKey(fields.categoryKey, file.name);
      await env.SUPPORT_FILES.put(uploadedKey, file.stream(), { httpMetadata: { contentType: checked.mime } });
      fileData = { key: uploadedKey, name: file.name, size: file.size, mime: checked.mime };
    }
    const now = new Date().toISOString();
    const publishedAt = fields.status === 'published' ? now : null;
    const result = await env.DB.prepare(`INSERT INTO resources
      (category_key, product_key, resource_type, title_zh, title_en, summary_zh, summary_en, version, language,
       r2_key, external_url, file_name, file_size, mime_type, status, sort_order, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(fields.categoryKey, fields.productKey, fields.resourceType, fields.titleZh, fields.titleEn, fields.summaryZh,
        fields.summaryEn, fields.version, fields.language, fileData.key, fields.externalUrl, fileData.name, fileData.size,
        fileData.mime, fields.status, fields.sortOrder, publishedAt, now, now).run();
    if (!result.success || !result.meta?.last_row_id) throw new Error('database_insert_failed');
    const row = await findResource(env, result.meta.last_row_id);
    console.info('Admin created resource', { id: row.id, actor: request.adminIdentity?.email || request.adminIdentity?.subject || 'access-user' });
    return json({ success: true, data: publicRecord(row) }, 201);
  } catch (cause) {
    if (uploadedKey) { try { await env.SUPPORT_FILES.delete(uploadedKey); } catch (rollbackError) { console.error('R2 rollback failed after create error', { keyHash: await hashKey(uploadedKey), reason: String(rollbackError) }); } }
    const known = Boolean(cause.code);
    const status = known ? (cause.status || 400) : 500;
    console.warn('Admin create resource failed', { reason: cause.code || cause.message });
    return fail(status >= 500 ? '保存资料失败' : cause.message, status, cause.code || 'internal_error');
  }
}

export async function updateResource(request, env, id) {
  const existing = await findResource(env, id);
  if (!existing) return fail('资料不存在', 404, 'not_found');
  let newKey = null;
  try {
    const form = await parseMultipart(request);
    const fields = parseFields(form, existing);
    const file = form.get('file');
    const replace = file instanceof File && Boolean(file.name);
    let fileData = { key: existing.r2_key, name: existing.file_name, size: existing.file_size, mime: existing.mime_type };
    if (replace) {
      const checked = validateUpload(file);
      newKey = createObjectKey(fields.categoryKey, file.name);
      await env.SUPPORT_FILES.put(newKey, file.stream(), { httpMetadata: { contentType: checked.mime } });
      fileData = { key: newKey, name: file.name, size: file.size, mime: checked.mime };
    }
    if (!fileData.key && !fields.externalUrl) return fail('文件和外部链接至少需要填写一个', 400, 'missing_content');
    const now = new Date().toISOString();
    const publishedAt = fields.status === 'published' ? (existing.published_at || now) : existing.published_at;
    const updateResult = await env.DB.prepare(`UPDATE resources SET category_key=?, product_key=?, resource_type=?, title_zh=?, title_en=?,
      summary_zh=?, summary_en=?, version=?, language=?, r2_key=?, external_url=?, file_name=?, file_size=?, mime_type=?,
      status=?, sort_order=?, published_at=?, updated_at=? WHERE id=?`)
      .bind(fields.categoryKey, fields.productKey, fields.resourceType, fields.titleZh, fields.titleEn, fields.summaryZh,
        fields.summaryEn, fields.version, fields.language, fileData.key, fields.externalUrl, fileData.name, fileData.size,
        fileData.mime, fields.status, fields.sortOrder, publishedAt, now, id).run();
    if (!updateResult.success) throw new Error('database_update_failed');
    if (replace && existing.r2_key && existing.r2_key !== newKey) {
      try { await env.SUPPORT_FILES.delete(existing.r2_key); } catch (cause) { console.error('Old R2 object cleanup failed after update', { id, reason: String(cause) }); }
    }
    console.info('Admin updated resource', { id });
    return json({ success: true, data: publicRecord(await findResource(env, id)) });
  } catch (cause) {
    if (newKey) { try { await env.SUPPORT_FILES.delete(newKey); } catch (rollbackError) { console.error('New R2 object rollback failed after update error', { id, reason: String(rollbackError) }); } }
    console.warn('Admin update resource failed', { id, reason: cause.code || cause.message });
    const known = Boolean(cause.code);
    return fail(known ? cause.message : '更新资料失败', known ? (cause.status || 400) : 500, cause.code || 'internal_error');
  }
}

async function changeStatus(request, env, id) {
  const existing = await findResource(env, id);
  if (!existing) return fail('资料不存在', 404, 'not_found');
  let body;
  try { body = await request.json(); } catch { return fail('请求JSON格式不正确'); }
  if (!STATUSES.has(body.status)) return fail('状态只允许draft、published或unpublished');
  const now = new Date().toISOString();
  const publishedAt = body.status === 'published' ? (existing.published_at || now) : existing.published_at;
  await env.DB.prepare('UPDATE resources SET status = ?, published_at = ?, updated_at = ? WHERE id = ?').bind(body.status, publishedAt, now, id).run();
  console.info('Admin changed resource status', { id, status: body.status });
  return json({ success: true, data: publicRecord(await findResource(env, id)) });
}

async function deleteResource(env, id) {
  const existing = await findResource(env, id);
  if (!existing) return fail('资料不存在', 404, 'not_found');
  const result = await env.DB.prepare('DELETE FROM resources WHERE id = ?').bind(id).run();
  if (!result.success) return fail('删除资料失败', 500, 'database_delete_failed');
  let warning = null;
  if (existing.r2_key) {
    try { await env.SUPPORT_FILES.delete(existing.r2_key); } catch (cause) {
      warning = { code: 'r2_cleanup_failed', message: '数据库记录已删除，但文件清理失败，请联系管理员处理' };
      console.error('R2 cleanup failed after database delete', { id, reason: String(cause) });
    }
  }
  console.info('Admin deleted resource', { id, r2Cleanup: warning ? 'failed' : 'complete' });
  return json({ success: true, data: { id }, warning });
}

async function hashKey(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).slice(0, 6).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function handleAdminApi(request, env, pathname) {
  try {
    if (pathname === '/api/admin/resources') {
      if (request.method === 'GET') return listResources(request, env);
      if (request.method === 'POST') return createResource(request, env);
      return fail('不支持的请求方法', 405, 'method_not_allowed');
    }
    const statusMatch = pathname.match(/^\/api\/admin\/resources\/(\d+)\/status$/);
    if (statusMatch) return request.method === 'PATCH' ? changeStatus(request, env, Number(statusMatch[1])) : fail('不支持的请求方法', 405, 'method_not_allowed');
    const itemMatch = pathname.match(/^\/api\/admin\/resources\/(\d+)$/);
    if (itemMatch) {
      const id = Number(itemMatch[1]);
      if (request.method === 'PUT') return updateResource(request, env, id);
      if (request.method === 'DELETE') return deleteResource(env, id);
      return fail('不支持的请求方法', 405, 'method_not_allowed');
    }
    return fail('管理接口不存在', 404, 'not_found');
  } catch (cause) {
    console.error('Admin API request failed', { path: pathname, reason: cause instanceof Error ? cause.message : 'unknown' });
    return fail('服务器处理请求失败', 500, 'internal_error');
  }
}
