(function () {
  const list = document.querySelector('#article-list');
  if (!list) return;

  const lang = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'zh';
  const text = lang === 'zh' ? {
    productNames: { yingao: '影獒', tieao: '铁獒' },
    allCount: (count) => `共 ${count} 条内容`,
    expand: '全部展开', collapse: '全部收起', preview: '预览', download: '下载',
    emptyTitle: '该栏目暂无资料', emptyBody: '资料将在后续接入，请浏览其他栏目或联系技术支持。',
    previewLabel: '文档预览', updated: '更新于', overview: '文档说明', preparation: '使用前准备', steps: '操作步骤',
    previewNote: '当前为前端演示资料，后续可接入D1中的真实文章、PDF、固件、视频和工具记录。',
  } : {
    productNames: { yingao: 'Yingao', tieao: 'Tieao' },
    allCount: (count) => `${count} resources`,
    expand: 'Expand all', collapse: 'Collapse all', preview: 'Preview', download: 'Download',
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
  const content = globalThis.SUPPORT_DEMO_CONTENT || [];
  const params = new URLSearchParams(location.search);
  let productKey = ['yingao', 'tieao'].includes(params.get('product')) ? params.get('product') : 'yingao';
  const productNodes = nodes.filter((node) => node.product_key === productKey);
  const categories = productNodes.filter((node) => node.node_type === 'category');
  const legacyParent = { docs: 'documents', sdk: 'sdk', firmware: 'firmware', video: 'video', faq: 'faq', tools: 'tools' }[params.get('type')];
  let selected = categories.find((node) => node.category_key === params.get('category'));
  if (!selected && legacyParent) selected = categories.find((node) => node.parent_key === legacyParent);
  if (!selected) selected = categories[0];
  let currentPreview = null;
  document.querySelector('#category-search-input').value = params.get('q') || '';

  const nameOf = (node) => node[lang === 'zh' ? 'name_zh' : 'name_en'];
  const titleOf = (item) => item[lang === 'zh' ? 'title_zh' : 'title_en'];
  const descriptionOf = (item) => item[lang === 'zh' ? 'description_zh' : 'description_en'];
  const tagOf = (item) => item[lang === 'zh' ? 'tag_zh' : 'tag_en'];
  const parentOf = (node) => productNodes.find((item) => item.node_type === 'parent' && item.parent_key === node.parent_key);

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
    let items = content.filter((item) => item.product_key === productKey && item.category_key === selected.category_key && `${titleOf(item)}${descriptionOf(item)}${tagOf(item)}`.toLowerCase().includes(query));
    const sort = document.querySelector('#sort-select').value;
    if (sort === 'newest') items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (sort === 'title') items.sort((a, b) => titleOf(a).localeCompare(titleOf(b), lang === 'zh' ? 'zh-CN' : 'en'));
    list.innerHTML = items.map((item) => `<article class="article-item"><span class="article-type">${tagOf(item)}</span><span class="article-info"><h3>${titleOf(item)}</h3><p>${descriptionOf(item)}</p></span><span class="article-meta">${item.version} · ${item.updated_at}</span><span class="article-actions"><button class="preview-button" type="button" data-preview="${item.id}">${text.preview}</button><button class="article-download" type="button" data-download="${item.id}">${text.download}</button></span></article>`).join('');
    document.querySelector('#result-count').textContent = text.allCount(items.length);
    const empty = document.querySelector('#empty-state');
    empty.hidden = items.length !== 0;
    empty.querySelector('strong').textContent = text.emptyTitle;
    empty.querySelector('p').textContent = text.emptyBody;
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
    render();
  }

  function documentText(item) {
    if (lang === 'zh') return `${titleOf(item)}\n\n${descriptionOf(item)}\n\n版本：${item.version}\n更新日期：${item.updated_at}\n\n该文件为技术支持门户演示资料。`;
    return `${titleOf(item)}\n\n${descriptionOf(item)}\n\nVersion: ${item.version}\nUpdated: ${item.updated_at}\n\nThis file is demonstration content from the technical support portal.`;
  }

  function download(item) {
    const blob = new Blob([documentText(item)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${titleOf(item)}-${item.version}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function openPreview(item) {
    currentPreview = item;
    document.querySelector('#preview-title').textContent = titleOf(item);
    document.querySelector('#preview-version').textContent = `${item.version} · ${text.updated} ${item.updated_at}`;
    document.querySelector('.preview-label').textContent = text.previewLabel;
    document.querySelector('#preview-body').innerHTML = `<h3>${text.overview}</h3><p>${descriptionOf(item)}</p><div class="preview-note">${text.previewNote}</div><h3>${text.preparation}</h3><p>${lang === 'zh' ? '请确认设备状态正常，并选择与产品和软件版本匹配的资料。' : 'Confirm the device status and select resources matching the product and software version.'}</p><h3>${text.steps}</h3><p>${lang === 'zh' ? '按照资料说明完成相关操作，并验证运行结果。' : 'Follow the resource instructions and verify the result.'}</p>`;
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
    const downloadButton = event.target.closest('[data-download]');
    if (preview) openPreview(content.find((item) => item.id === preview.dataset.preview));
    if (downloadButton) download(content.find((item) => item.id === downloadButton.dataset.download));
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
  render();
})();
