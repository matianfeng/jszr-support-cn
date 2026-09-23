import assert from 'node:assert/strict';
import { verifyAccessRequest } from '../src/access-auth.js';
import { createResource, updateResource, validateUpload, handleAdminApi, MAX_UPLOAD_BYTES } from '../src/admin-api.js';

function formRequest(fields, file, headers = {}) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.set(key, String(value)));
  if (file) form.set('file', file);
  return new Request('http://local/api/admin/resources', { method: 'POST', body: form, headers });
}

const base = {
  product_key: 'yingao', category_key: 'yingao.documents.quick-start', resource_type: 'document',
  title_zh: '测试资料', language: 'zh-CN', sort_order: '0', status: 'draft',
};

const noConfig = await verifyAccessRequest(new Request('http://local/api/admin/resources'), {});
assert.equal(noConfig.status, 403);
const forged = await verifyAccessRequest(new Request('http://local/api/admin/resources', { headers: { 'Cf-Access-Jwt-Assertion': 'forged.token' } }), { ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com', ACCESS_AUD: 'test-aud' });
assert.equal(forged.status, 401);

const noContent = await createResource(formRequest(base), {});
assert.equal(noContent.status, 400);
assert.equal((await noContent.json()).error.code, 'missing_content');
const badCategory = await createResource(formRequest({ ...base, category_key: 'tieao.documents.quick-start', external_url: 'https://example.com' }), {});
assert.equal((await badCategory.json()).error.code, 'invalid_category');
const missingTitle = await createResource(formRequest({ ...base, title_zh: '', external_url: 'https://example.com' }), {});
assert.equal((await missingTitle.json()).error.code, 'invalid_title');

assert.throws(() => validateUpload(new File([''], 'empty.pdf', { type: 'application/pdf' })), /空文件/);
assert.throws(() => validateUpload(new File(['x'], 'payload.html', { type: 'text/html' })), /不支持/);
const oversized = await createResource(formRequest({ ...base, external_url: 'https://example.com' }, null, { 'Content-Length': String(MAX_UPLOAD_BYTES + 2 * 1024 * 1024) }), {});
assert.equal(oversized.status, 413);

const rollback = { put: [], delete: [] };
const failingCreateEnv = {
  SUPPORT_FILES: {
    async put(key) { rollback.put.push(key); },
    async delete(key) { rollback.delete.push(key); },
  },
  DB: { prepare() { return { bind() { return { async run() { throw new Error('private SQL detail'); } }; } }; } },
};
const createFailure = await createResource(formRequest(base, new File(['pdf'], 'guide.pdf', { type: 'application/pdf' })), failingCreateEnv);
assert.equal(createFailure.status, 500);
assert.equal((await createFailure.json()).error.message, '保存资料失败');
assert.equal(rollback.put.length, 1);
assert.deepEqual(rollback.delete, rollback.put);

const oldKey = 'yingao/documents/quick-start/old-guide.pdf';
const replacement = { put: [], delete: [] };
const existing = { id: 7, ...base, r2_key: oldKey, file_name: 'old.pdf', file_size: 3, mime_type: 'application/pdf', title_en: null, summary_zh: null, summary_en: null, version: null, external_url: null, published_at: null };
const failingUpdateEnv = {
  SUPPORT_FILES: {
    async put(key) { replacement.put.push(key); },
    async delete(key) { replacement.delete.push(key); },
  },
  DB: { prepare(sql) { return { bind() { return sql.startsWith('SELECT') ? { async first() { return existing; } } : { async run() { throw new Error('update failed'); } }; } }; } },
};
const updateRequest = formRequest(base, new File(['new'], 'new.pdf', { type: 'application/pdf' }));
const updateFailure = await updateResource(updateRequest, failingUpdateEnv, 7);
assert.equal(updateFailure.status, 500);
assert.equal(replacement.put.length, 1);
assert.deepEqual(replacement.delete, replacement.put);
assert.ok(!replacement.delete.includes(oldKey));

let statusRow = { ...existing, status: 'draft' };
const statusEnv = {
  DB: { prepare(sql) { return { bind(...values) { if (sql.startsWith('SELECT')) return { async first() { return statusRow; } }; return { async run() { statusRow = { ...statusRow, status: values[0], published_at: values[1], updated_at: values[2] }; return { success: true }; } }; } }; } },
};
const statusResponse = await handleAdminApi(new Request('http://local/api/admin/resources/7/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'published' }) }), statusEnv, '/api/admin/resources/7/status');
assert.equal(statusResponse.status, 200);
assert.equal((await statusResponse.json()).data.status, 'published');
const missingEnv = { DB: { prepare() { return { bind() { return { async first() { return null; } }; } }; } } };
const missingResponse = await updateResource(formRequest(base), missingEnv, 999);
assert.equal(missingResponse.status, 404);

console.log('PASS: admin auth defaults closed and forged headers are rejected');
console.log('PASS: form, category, product, title, content, size and type validation');
console.log('PASS: create rollback removes new object after D1 failure');
console.log('PASS: update rollback removes replacement and preserves old object');
console.log('PASS: status changes and missing IDs are handled');
