(function () {
  const list = document.querySelector('#article-list');
  if (!list) return;

  const lang = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'zh';
  const text = lang === 'zh' ? {
    productNames: { yingao: '影獒', tieao: '铁獒' },
    allCount: (count) => `共 ${count} 条内容`,
    expand: '全部展开', collapse: '全部收起', preview: '预览', download: '下载', openLink: '打开链接',
    loadingTitle: '正在加载资料', loadingBody: '请稍候…', loadErrorTitle: '资料加载失败', loadErrorBody: '请稍后重试。',
    emptyTitle: '该栏目暂无资料', emptyBody: '资料将在后续接入，请浏览其他栏目或联系技术支持。',
    previewLabel: '文档预览', updated: '更新于', overview: '文档说明', preparation: '使用前准备', steps: '操作步骤',
    previewNote: '当前为前端演示资料，后续可接入D1中的真实文章、PDF、固件、视频和工具记录。',
  } : {
    productNames: { yingao: 'Yingao', tieao: 'Tieao' },
    allCount: (count) => `${count} resources`,
    expand: 'Expand all', collapse: 'Collapse all', preview: 'Preview', download: 'Download', openLink: 'Open link',
    loadingTitle: 'Loading resources', loadingBody: 'Please wait…', loadErrorTitle: 'Failed to load resources', loadErrorBody: 'Please try again later.',
    emptyTitle: 'No resources in this category', emptyBody: 'Resources will be added later. Browse another category or contact support.',
    previewLabel: 'DOCUMENT PREVIEW', updated: 'Updated', overview: 'Overview', preparation: 'Preparation', steps: 'Steps',
    previewNote: 'This is demonstration content. Real articles, PDFs, firmware, videos and tools can be connected from D1 later.',
  };

  const icons = {
    documents: '<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>',
    sdk: '<svg viewBox="0 0 24 24"><path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 2l-4 20"/></svg>',
    firmware: '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 14H3v7h18v-7h-2"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="m10 8 5 3-5 3zM8 21h8M12 17v4"/></svg>',
    faq: '<svg viewBox="0 0 24 24"><path d="M20 15a8 8 0 1 0-4 4l5 2-1-6Z"/><path d="M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.8.3-1.2.8-1.2 1.6M11.5 16h.01"/></svg>',
    tools: '<svg viewBox="0 0 24 24"><path d="M14 7a5 5 0 0 0 6 6L10 23l-4-4 10-10a5 5 0 0 0-2-6v4Z"/><path d="m5 18-2 2 1 1 2-2"/></svg>',
  };

  const nodes = globalThis.SUPPORT_CATEGORIES || [];
  const params = new URLSearchParams(location.search);
  let productKey = ['yingao', 'tieao'].includes(params.get('product')) ? params.get('product') : 'yingao';
  const productNodes = nodes.filter((node) => node.product_key === productKey);
  const categories = productNodes.filter((node) => node.node_type === 'category');
  const legacyParent = { docs: 'documents', sdk: 'sdk', firmware: 'firmware', video: 'video', faq: 'faq', tools: 'tools' }[params.get('type')];
  let selected = categories.find((node) => node.category_key === params.get('category'));
  if (!selected && legacyParent) selected = categories.find((node) => node.parent_key === legacyParent);
  if (!selected) selected = categories[0];
  let currentPreview = null;
  let currentItems = [];
  let requestController = null;
  document.querySelector('#category-search-input').value = params.get('q') || '';

  const nameOf = (node) => node[lang === 'zh' ? 'name_zh' : 'name_en'];
  const titleOf = (item) => item.title;
  const descriptionOf = (item) => item.summary || '';
  const tagOf = (item) => item.resource_type;
  const parentOf = (node) => productNodes.find((item) => item.node_type === 'parent' && item.parent_key === node.parent_key);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

  document.body.classList.add('product-category-page', `category-${productKey}`);
  const languageLink = document.querySelector('#language-link');
  const otherPage = lang === 'zh' ? 'category-en.html' : 'category.html';
  languageLink.href = `${otherPage}?product=${productKey}&category=${encodeURIComponent(selected.category_key)}&lang=${lang === 'zh' ? 'en' : 'zh'}`;

  const tree = document.querySelector('#document-tree');
  const parents = productNodes.filter((node) => node.node_type === 'parent').sort((a, b) => a.sort_order - b.sort_order);
  tree.innerHTML = parents.map((parent) => {
    const children = categories.filter((node) => node.parent_key === parent.parent_key).sort((a, b) => a.sort_order - b.sort_order);
    const open = children.some((node) => node.category_key === selected.category_key);
    return `<div class="tree-group ${open ? 'open' : ''}" data-parent="${parent.parent_key}"><button class="tree-toggle ${open ? 'active' : ''}" type="button"><span class="tree-chevron">›</span><span>${nameOf(parent)}</span><small>(${children.length})</small></button><div class="tree-children">${children.map((node) => `<button class="tree-document ${node.category_key === selected.category_key ? 'active' : ''}" type="button" data-category="${node.category_key}">${nameOf(node)}</button>`).join('')}</div></div>`;
  }).join('');

  function syncUrl(push) {
    const url = `${lang === 'zh' ? 'category.html' : 'category-en.html'}?product=${productKey}&category=${encodeURIComponent(selected.category_key)}&lang=${lang}`;
    history[push ? 'pushState' : 'replaceState']({ category: selected.category_key }, '', url);
    languageLink.href = `${otherPage}?product=${productKey}&category=${encodeURIComponent(selected.category_key)}&lang=${lang === 'zh' ? 'en' : 'zh'}`;
  }

  function updateHeader() {
    const parent = parentOf(selected);
    const productName = text.productNames[productKey];
    document.title = `${productName} ${nameOf(selected)} · ${lang === 'zh' ? '技术支持中心' : 'Technical Support'}`;
    document.querySelector('#breadcrumb-name').textContent = `${productName} / ${nameOf(parent)} / ${nameOf(selected)}`;
    document.querySelector('#category-title').textContent = `${productName} · ${nameOf(parent)}`;
    document.querySelector('#category-description').textContent = nameOf(selected);
    document.querySelector('#category-icon').innerHTML = icons[parent.parent_key];
    document.querySelector('#content-title').textContent = nameOf(selected);
  }

  function render() {
    const query = document.querySelector('#category-search-input').value.trim().toLowerCase();
    let items = currentItems.filter((item) => `${titleOf(item)}${descriptionOf(item)}${tagOf(item)}`.toLowerCase().includes(query));
    const sort = document.querySelector('#sort-select').value;
    if (sort === 'newest') items.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    if (sort === 'title') items.sort((a, b) => titleOf(a).localeCompare(titleOf(b), lang === 'zh' ? 'zh-CN' : 'en'));
    list.innerHTML = items.map((item) => {
      const previewable = item.has_file && (item.resource_type === 'document' || item.resource_type === 'faq' || /^(application\/pdf|image\/|text\/)/.test(item.mime_type || ''));
      const actions = [
        previewable ? `<button class="preview-button" type="button" data-file-preview="${item.id}">${text.preview}</button>` : '',
        item.has_file ? `<button class="article-download" type="button" data-download="${item.id}">${text.download}</button>` : '',
        item.has_external_url ? `<button class="preview-button" type="button" data-external="${item.id}">${text.openLink}</button>` : '',
        !item.has_file && !item.has_external_url ? `<button class="preview-button" type="button" data-preview="${item.id}">${text.preview}</button>` : '',
      ].join('');
      return `<article class="article-item"><span class="article-type">${escapeHtml(tagOf(item))}</span><span class="article-info"><h3>${escapeHtml(titleOf(item))}</h3><p>${escapeHtml(descriptionOf(item))}</p></span><span class="article-meta">${escapeHtml(item.version || '')}${item.published_at ? ` · ${escapeHtml(item.published_at)}` : ''}</span><span class="article-actions">${actions}</span></article>`;
    }).join('');
    document.querySelector('#result-count').textContent = text.allCount(items.length);
    const empty = document.querySelector('#empty-state');
    empty.hidden = items.length !== 0;
    empty.querySelector('strong').textContent = text.emptyTitle;
    empty.querySelector('p').textContent = text.emptyBody;
  }

  function showState(title, body) {
    list.innerHTML = '';
    document.querySelector('#result-count').textContent = '';
    const empty = document.querySelector('#empty-state');
    empty.hidden = false;
    empty.querySelector('strong').textContent = title;
    empty.querySelector('p').textContent = body;
  }

  async function loadResources() {
    if (requestController) requestController.abort();
    requestController = new AbortController();
    const controller = requestController;
    currentItems = [];
    showState(text.loadingTitle, text.loadingBody);
    try {
      const apiLang = lang === 'zh' ? 'zh-CN' : 'en';
      const response = await fetch(`/api/resources?category=${encodeURIComponent(selected.category_key)}&lang=${encodeURIComponent(apiLang)}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) throw new Error('Invalid API response');
      if (controller !== requestController) return;
      currentItems = payload.data;
      render();
    } catch (error) {
      if (error.name === 'AbortError' || controller !== requestController) return;
      showState(text.loadErrorTitle, text.loadErrorBody);
    }
  }

  function selectCategory(categoryKey, push = true) {
    const next = categories.find((node) => node.category_key === categoryKey);
    if (!next) return;
    selected = next;
    tree.querySelectorAll('.tree-document').forEach((button) => button.classList.toggle('active', button.dataset.category === categoryKey));
    tree.querySelectorAll('.tree-toggle').forEach((button) => button.classList.remove('active'));
    const group = tree.querySelector(`[data-parent="${selected.parent_key}"]`);
    group.classList.add('open');
    group.querySelector('.tree-toggle').classList.add('active');
    document.querySelector('#category-search-input').value = '';
    syncUrl(push);
    updateHeader();
    loadResources();
  }

  function download(item) {
    location.href = `/api/resources/${item.id}/file?download=1`;
  }

  function openPreview(item) {
    currentPreview = item;
    document.querySelector('#preview-title').textContent = titleOf(item);
    document.querySelector('#preview-version').textContent = `${item.version || ''}${item.published_at ? ` · ${text.updated} ${item.published_at}` : ''}`;
    document.querySelector('.preview-label').textContent = text.previewLabel;
    document.querySelector('#preview-body').innerHTML = `<h3>${text.overview}</h3><p>${escapeHtml(descriptionOf(item) || (lang === 'zh' ? '暂无摘要。' : 'No summary available.'))}</p><div class="preview-note">${text.previewNote}</div>`;
    const modal = document.querySelector('#preview-modal');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  tree.addEventListener('click', (event) => {
    const toggle = event.target.closest('.tree-toggle');
    const category = event.target.closest('[data-category]');
    if (toggle) toggle.closest('.tree-group').classList.toggle('open');
    if (category) selectCategory(category.dataset.category);
  });
  document.querySelector('#expand-all').addEventListener('click', (event) => {
    const groups = [...tree.querySelectorAll('.tree-group')];
    const allOpen = groups.every((group) => group.classList.contains('open'));
    groups.forEach((group) => group.classList.toggle('open', !allOpen));
    event.currentTarget.textContent = allOpen ? text.expand : text.collapse;
  });
  document.querySelector('#category-search').addEventListener('submit', (event) => { event.preventDefault(); render(); });
  document.querySelector('#category-search-input').addEventListener('input', render);
  document.querySelector('#sort-select').addEventListener('change', render);
  list.addEventListener('click', (event) => {
    const preview = event.target.closest('[data-preview]');
    const filePreview = event.target.closest('[data-file-preview]');
    const downloadButton = event.target.closest('[data-download]');
    const external = event.target.closest('[data-external]');
    if (preview) openPreview(currentItems.find((item) => String(item.id) === preview.dataset.preview));
    if (filePreview) window.open(`/api/resources/${filePreview.dataset.filePreview}/file`, '_blank', 'noopener');
    if (downloadButton) download(currentItems.find((item) => String(item.id) === downloadButton.dataset.download));
    if (external) {
      const item = currentItems.find((resource) => String(resource.id) === external.dataset.external);
      if (item?.external_url) window.open(item.external_url, '_blank', 'noopener,noreferrer');
    }
  });
  document.querySelector('#preview-modal').addEventListener('click', (event) => {
    if (event.target.closest('[data-close-preview]')) { event.currentTarget.hidden = true; document.body.style.overflow = ''; }
  });
  document.querySelector('#preview-download').addEventListener('click', () => currentPreview && download(currentPreview));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { document.querySelector('#preview-modal').hidden = true; document.body.style.overflow = ''; }
  });
  addEventListener('popstate', () => {
    const categoryKey = new URLSearchParams(location.search).get('category');
    if (categoryKey) selectCategory(categoryKey, false);
  });

  syncUrl(false);
  updateHeader();
  loadResources();
})();
