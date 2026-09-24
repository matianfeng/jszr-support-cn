const icon = (name) => {
  const icons = {
    documents: '<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>',
    sdk: '<svg viewBox="0 0 24 24"><path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 2l-4 20"/></svg>', firmware: '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 14H3v7h18v-7h-2"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="m10 8 5 3-5 3zM8 21h8M12 17v4"/></svg>', faq: '<svg viewBox="0 0 24 24"><path d="M20 15a8 8 0 1 0-4 4l5 2-1-6Z"/><path d="M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.8.3-1.2.8-1.2 1.6M11.5 16h.01"/></svg>',
    tools: '<svg viewBox="0 0 24 24"><path d="M14 7a5 5 0 0 0 6 6L10 23l-4-4 10-10a5 5 0 0 0-2-6v4Z"/><path d="m5 18-2 2 1 1 2-2"/></svg>',
  }; return icons[name] || icons.documents;
};
const products = { yingao: { name: '影獒', model: 'YINGAO / 01', tagline: '全球首款15公斤级小型机器狗', image: 'assets/yingao.png', theme: 'yingao-theme' }, tieao: { name: '铁獒', model: 'TIEAO / 02', tagline: '业内首款轻体型、高负载、全防护的中型机器狗', image: 'assets/tieao.png', theme: 'tieao-theme' } };
function initHome() {
  const grid = document.querySelector('#resource-grid'); if (!grid) return;
  let activeProduct = 'yingao'; let switchTimer; let searchController; let showingSearchResults = false; const section = document.querySelector('#product-resources');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const descriptions = { documents: '产品手册、规格参数、使用指南等', sdk: 'SDK下载、开发指南、API文档等', firmware: '固件版本、发布说明、升级包等', video: '入门教程、功能演示、操作视频等', faq: '热门问题解答、故障排查、解决方案等', tools: '开发工具、配置软件、示例代码等' };
  const renderCards = () => { const nodes = globalThis.SUPPORT_CATEGORIES.filter((node) => node.product_key === activeProduct); grid.innerHTML = nodes.filter((node) => node.node_type === 'parent').sort((a, b) => a.sort_order - b.sort_order).map((parent) => { const first = nodes.find((node) => node.node_type === 'category' && node.parent_key === parent.parent_key); return `<a class="resource-card" href="category.html?product=${activeProduct}&category=${encodeURIComponent(first.category_key)}&lang=zh"><span class="card-icon">${icon(parent.parent_key)}</span><span class="card-copy"><h3>${parent.name_zh}</h3><p>${descriptions[parent.parent_key]}</p></span><span class="card-arrow">→</span></a>`; }).join(''); };
  const switchProduct = (id) => { if (!products[id] || (id === activeProduct && !showingSearchResults)) return; showingSearchResults = false; activeProduct = id; const product = products[id], visual = document.querySelector('.product-visual'), image = document.querySelector('#product-image'); section.classList.remove('yingao-theme', 'tieao-theme'); section.classList.add(product.theme); document.querySelector('#selected-product-name').textContent = product.name; document.querySelector('#visual-model').textContent = product.model; document.querySelector('#product-tagline').textContent = product.tagline; document.querySelector('.product-switcher').classList.toggle('is-second', id === 'tieao'); document.querySelectorAll('.product-option').forEach((button) => { const active = button.dataset.product === id; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }); clearTimeout(switchTimer); visual.classList.add('switching'); switchTimer = setTimeout(() => { image.src = product.image; image.alt = `${product.name}产品图`; visual.classList.remove('switching'); }, 220); renderCards(); };
  renderCards(); document.querySelectorAll('.product-option').forEach((button) => { button.addEventListener('mouseenter', () => switchProduct(button.dataset.product)); button.addEventListener('focus', () => switchProduct(button.dataset.product)); button.addEventListener('click', () => switchProduct(button.dataset.product)); });
  document.querySelector('#search-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const input = document.querySelector('#search-input'); const query = input.value.trim(); const message = document.querySelector('#search-message');
    if (!query) return input.focus();
    if (searchController) searchController.abort(); searchController = new AbortController(); message.textContent = '正在搜索正式资料…';
    try {
      const response = await fetch(`/api/resources/search?q=${encodeURIComponent(query)}&lang=zh-CN`, { signal: searchController.signal, headers: { Accept: 'application/json' } });
      const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error || '搜索失败');
      message.textContent = payload.count ? `找到 ${payload.count} 条资料` : '没有找到相关正式资料';
      const matchedProducts = [...new Set(payload.data.map((item) => item.product_key).filter((key) => products[key]))];
      if (matchedProducts.length === 1) switchProduct(matchedProducts[0]);
      else if (matchedProducts.length > 1) {
        document.querySelector('#selected-product-name').textContent = '搜索结果';
        document.querySelectorAll('.product-option').forEach((button) => { button.classList.remove('active'); button.setAttribute('aria-pressed', 'false'); });
      }
      showingSearchResults = true;
      grid.innerHTML = payload.data.map((item) => {
        const category = globalThis.SUPPORT_CATEGORIES.find((node) => node.category_key === item.category_key && node.product_key === item.product_key);
        const productName = products[item.product_key]?.name || item.product_key;
        const href = `category.html?product=${encodeURIComponent(item.product_key)}&category=${encodeURIComponent(item.category_key)}&lang=zh-CN&q=${encodeURIComponent(query)}`;
        return `<a class="resource-card" href="${href}"><span class="card-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(productName)} · ${escapeHtml(category?.name_zh || item.category_key)}${item.summary ? ` · ${escapeHtml(item.summary)}` : ''}</p></span><span class="card-arrow">→</span></a>`;
      }).join('');
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (cause) { if (cause.name !== 'AbortError') message.textContent = '资料搜索失败，请稍后重试'; }
  });
}
initHome();
