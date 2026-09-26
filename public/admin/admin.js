(function () {
  const nodes = globalThis.SUPPORT_CATEGORIES || [];
  const parents = nodes.filter((node) => node.node_type === 'parent');
  const categories = nodes.filter((node) => node.node_type === 'category');
  const labels = Object.fromEntries(nodes.filter((node) => node.category_key).map((node) => [node.category_key, node.name_zh]));
  const products = { yingao: '影獒', tieao: '铁獒' };
  const typeLabels = { document: '文档', sdk: 'SDK', firmware: '固件', video: '视频', faq: '常见问题', tool: '工具', link: '外部链接' };
  const statusLabels = { draft: '草稿', published: '已发布', unpublished: '已下架' };
  const languageLabels = { 'zh-CN': '中文资料', en: '英文资料' };
  const filterForm = document.querySelector('#filter-form');
  const editor = document.querySelector('#editor-dialog');
  const form = document.querySelector('#resource-form');
  const rows = document.querySelector('#resource-rows');
  const listState = document.querySelector('#list-state');
  const deleteDialog = document.querySelector('#delete-dialog');
  let resources = [];
  let submitStatus = 'draft';
  let csrfToken = '';

  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const date = (value) => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  function toast(message) { const element = document.querySelector('#toast'); element.textContent = message; element.classList.add('show'); setTimeout(() => element.classList.remove('show'), 2600); }

  async function api(path, options) {
    const method = (options?.method || 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...(options?.headers || {}) };
    if (!['GET', 'HEAD'].includes(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken;
    const response = await fetch(path, { ...options, headers });
    const payload = await response.json().catch(() => ({ success: false, error: { message: '服务器返回了无效响应' } }));
    if (response.status === 401) { location.replace('/admin/login?next=%2Fadmin%2F'); throw new Error('登录状态已失效'); }
    if (!response.ok || !payload.success) throw Object.assign(new Error(payload.error?.message || '请求失败'), { status: response.status });
    return payload;
  }

  function fillParents(product, select, allLabel = '请选择') {
    const visible = parents.filter((node) => !product || node.product_key === product).filter((node, index, list) => list.findIndex((item) => item.parent_key === node.parent_key) === index);
    select.innerHTML = `<option value="">${allLabel}</option>` + visible.map((node) => `<option value="${node.parent_key}">${escape(node.name_zh)}</option>`).join('');
  }
  function fillCategories(product, parent, select, allLabel = '请选择') {
    select.innerHTML = `<option value="">${allLabel}</option>` + categories.filter((node) => (!product || node.product_key === product) && (!parent || node.parent_key === parent)).map((node) => `<option value="${node.category_key}">${escape(node.name_zh)}</option>`).join('');
  }
  function bindCascade(productSelect, parentSelect, categorySelect, filtering) {
    productSelect.addEventListener('change', () => { fillParents(productSelect.value, parentSelect, filtering ? '全部父目录' : '请选择'); fillCategories(productSelect.value, '', categorySelect, filtering ? '全部末级栏目' : '请选择'); });
    parentSelect.addEventListener('change', () => fillCategories(productSelect.value, parentSelect.value, categorySelect, filtering ? '全部末级栏目' : '请选择'));
  }

  const filterProduct = filterForm.elements.product, filterParent = filterForm.elements.parent, filterCategory = filterForm.elements.category;
  fillParents('', filterParent, '全部父目录'); fillCategories('', '', filterCategory, '全部末级栏目'); bindCascade(filterProduct, filterParent, filterCategory, true);
  bindCascade(form.elements.product_key, form.elements.parent_key, form.elements.category_key, false);

  function render() {
    rows.innerHTML = resources.map((item) => `<tr>
      <td><strong>${escape(item.language === 'en' ? item.title_en : item.title_zh)}</strong><span class="sub">${escape(languageLabels[item.language] || item.language)}</span></td>
      <td>${escape(products[item.product_key])}<span class="sub">${escape(labels[item.category_key] || item.category_key)}</span></td>
      <td>${escape(typeLabels[item.resource_type] || item.resource_type)}</td><td>${escape(item.version || '—')}</td>
      <td>${escape(item.file_name || '—')}</td><td><span class="badge ${item.status}">${escape(statusLabels[item.status])}</span></td>
      <td>${date(item.published_at)}</td><td>${date(item.created_at)}</td>
      <td><div class="actions"><button data-action="edit" data-id="${item.id}">编辑</button>${item.status !== 'published' ? `<button data-action="status" data-status="published" data-id="${item.id}">发布</button>` : ''}${item.status !== 'unpublished' ? `<button data-action="status" data-status="unpublished" data-id="${item.id}">下架</button>` : ''}${item.status !== 'draft' ? `<button data-action="status" data-status="draft" data-id="${item.id}">转草稿</button>` : ''}<button data-action="delete" data-id="${item.id}">删除</button></div></td></tr>`).join('');
    listState.hidden = resources.length > 0;
    listState.textContent = resources.length ? '' : '暂无符合条件的资料';
  }

  async function load() {
    listState.hidden = false; listState.textContent = '正在加载资料…'; rows.innerHTML = '';
    const query = new URLSearchParams(new FormData(filterForm)); query.delete('parent');
    [...query.keys()].forEach((key) => { if (!query.get(key)) query.delete(key); });
    try { const payload = await api(`/api/admin/resources?${query}`); resources = payload.data; render(); }
    catch (cause) { listState.textContent = cause.message; }
  }

  function syncLanguageFields() {
    const language = form.elements.language.value;
    form.querySelectorAll('[data-language-field]').forEach((container) => {
      const active = container.dataset.languageField === language;
      container.hidden = !active;
      container.querySelectorAll('input,textarea').forEach((control) => { control.disabled = !active; control.required = active && control.name.startsWith('title_'); });
    });
    document.querySelector('#language-notice').textContent = language === 'en'
      ? '当前新增英文资料，只会显示在英文站。'
      : '当前新增中文资料，只会显示在中文站。';
  }

  function openEditor(item) {
    form.reset(); form.elements.id.value = item?.id || ''; document.querySelector('#editor-title').textContent = item ? '编辑资料' : '新增资料'; document.querySelector('#form-error').hidden = true;
    if (item) {
      for (const key of ['product_key','resource_type','title_zh','title_en','summary_zh','summary_en','version','language','sort_order','external_url']) if (form.elements[key]) form.elements[key].value = item[key] ?? '';
      fillParents(item.product_key, form.elements.parent_key); const categoryNode = categories.find((node) => node.category_key === item.category_key); form.elements.parent_key.value = categoryNode?.parent_key || '';
      fillCategories(item.product_key, categoryNode?.parent_key, form.elements.category_key); form.elements.category_key.value = item.category_key;
      document.querySelector('#file-help').textContent = item.file_name ? `当前文件：${item.file_name}。不选择新文件时保留原文件。` : '当前无文件；文件和外部链接至少填写一个。';
    } else { fillParents('', form.elements.parent_key); fillCategories('', '', form.elements.category_key); document.querySelector('#file-help').textContent = '单个文件不超过100MB；文件和外部链接至少填写一个。'; }
    syncLanguageFields(); editor.showModal();
  }

  document.querySelector('#create-button').addEventListener('click', () => openEditor());
  form.elements.language.addEventListener('change', syncLanguageFields);
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => editor.close()));
  filterForm.addEventListener('submit', (event) => { event.preventDefault(); load(); });
  form.querySelectorAll('button[type="submit"]').forEach((button) => button.addEventListener('click', () => { submitStatus = button.dataset.status; }));
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const data = new FormData(form); data.set('status', submitStatus); const id = data.get('id'); data.delete('id');
    const errorBox = document.querySelector('#form-error'); errorBox.hidden = true;
    try { await api(id ? `/api/admin/resources/${id}` : '/api/admin/resources', { method: id ? 'PUT' : 'POST', body: data }); editor.close(); toast(id ? '资料已更新' : '资料已创建'); await load(); }
    catch (cause) { errorBox.textContent = cause.message; errorBox.hidden = false; }
  });
  rows.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]'); if (!button) return; const item = resources.find((entry) => entry.id === Number(button.dataset.id)); if (!item) return;
    if (button.dataset.action === 'edit') return openEditor(item);
    if (button.dataset.action === 'status') { try { await api(`/api/admin/resources/${item.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: button.dataset.status }) }); toast('状态已更新'); await load(); } catch (cause) { toast(cause.message); } }
    if (button.dataset.action === 'delete') { deleteDialog.showModal(); const result = await new Promise((resolve) => deleteDialog.addEventListener('close', () => resolve(deleteDialog.returnValue), { once: true })); if (result !== 'confirm') return; try { const payload = await api(`/api/admin/resources/${item.id}`, { method: 'DELETE' }); toast(payload.warning?.message || '资料已删除'); await load(); } catch (cause) { toast(cause.message); } }
  });
  document.querySelector('#logout-button').addEventListener('click', async () => {
    try { await api('/api/admin/auth/logout', { method: 'POST' }); } catch (cause) { if (cause.status !== 401) toast(cause.message); }
    resources = []; csrfToken = ''; location.replace('/admin/login');
  });

  async function initialize() {
    try {
      const identity = await api('/api/admin/auth/me');
      csrfToken = identity.data.csrfToken;
      document.querySelector('#admin-account').textContent = identity.data.username;
      await load();
    } catch (cause) {
      if (cause.status !== 401) { listState.hidden = false; listState.textContent = cause.message; }
    }
  }
  initialize();
})();
