const icon = (name) => {
  const icons = {
    document: '<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>',
    code: '<svg viewBox="0 0 24 24"><path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 2l-4 20"/></svg>',
    firmware: '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 14H3v7h18v-7h-2"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="m10 8 5 3-5 3zM8 21h8M12 17v4"/></svg>',
    faq: '<svg viewBox="0 0 24 24"><path d="M20 15a8 8 0 1 0-4 4l5 2-1-6Z"/><path d="M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.8.3-1.2.8-1.2 1.6M11.5 16h.01"/></svg>',
    tools: '<svg viewBox="0 0 24 24"><path d="M14 7a5 5 0 0 0 6 6L10 23l-4-4 10-10a5 5 0 0 0-2-6v4Z"/><path d="m5 18-2 2 1 1 2-2"/></svg>'
  };
  return icons[name] || icons.document;
};

const categories = [
  {id:'docs',name:'产品文档',desc:'产品手册、规格参数、使用指南等',icon:'document'},
  {id:'sdk',name:'SDK与开发',desc:'SDK下载、开发指南、API文档等',icon:'code'},
  {id:'firmware',name:'固件下载',desc:'固件版本、发布说明、升级包等',icon:'firmware'},
  {id:'video',name:'教学视频',desc:'入门教程、功能演示、操作视频等',icon:'video'},
  {id:'faq',name:'常见问题',desc:'热门问题解答、故障排查、解决方案等',icon:'faq'},
  {id:'tools',name:'工具与资源',desc:'开发工具、配置软件、示例代码等',icon:'tools'}
];

const products = {
  yingao:{id:'yingao',name:'影獒',model:'YINGAO / 01',tagline:'全球首款15公斤级小型机器狗',image:'assets/yingao.png',theme:'yingao-theme'},
  tieao:{id:'tieao',name:'铁獒',model:'TIEAO / 02',tagline:'业内首款轻体型、高负载、全防护的中型机器狗',image:'assets/tieao.png',theme:'tieao-theme'}
};

const articleTemplates = {
  docs:[['快速入门指南','帮助您完成设备开箱、连接与首次配置','指南'],['产品规格参数说明','产品硬件规格、接口定义及环境要求','文档'],['安全使用与维护手册','设备日常使用、维护和安全注意事项','手册'],['网络连接配置指南','有线网络与无线网络的配置方法','指南']],
  sdk:[['SDK 快速接入指南','完成开发环境配置并运行第一个示例','开发指南'],['API 接口参考','核心能力接口、参数与返回值说明','API'],['Python SDK 下载与说明','适用于 Python 项目的开发套件','SDK'],['示例代码合集','常见业务场景的可运行示例','代码']],
  firmware:[['最新稳定版固件','推荐用于正式环境的稳定固件版本','固件'],['固件升级操作说明','在线与离线升级的完整操作步骤','指南'],['版本更新日志','查看固件版本功能更新与问题修复','日志'],['历史版本归档','下载仍在维护期内的历史版本','固件']],
  video:[['设备快速上手','从开箱到完成首次任务的完整演示','视频'],['开发环境配置','SDK 安装和开发工具配置演示','视频'],['核心功能操作演示','常用功能的操作方法与注意事项','视频'],['故障排查教程','定位常见连接及运行问题','视频']],
  faq:[['设备无法连接怎么办？','网络、供电和设备状态的排查方法','热门'],['如何恢复出厂设置？','恢复前注意事项与标准操作步骤','操作'],['SDK 初始化失败','环境依赖与权限配置问题排查','开发'],['在哪里查看设备日志？','日志导出、查看和反馈方法','诊断']],
  tools:[['设备配置工具','设备发现、网络及基础参数配置','工具'],['日志分析工具','快速解析设备运行日志并生成报告','工具'],['开发者资源包','图标、接口示例及调试资源合集','资源'],['命令行调试助手','用于设备诊断与接口联调的命令行工具','工具']]
};

function initHome(){
  const grid=document.querySelector('#resource-grid');
  if(!grid)return;
  let activeProduct='yingao'; let switchTimer;
  const section=document.querySelector('#product-resources');
  const renderCards=()=>{grid.innerHTML=categories.map(c=>`<a class="resource-card" href="category.html?product=${activeProduct}&type=${c.id}"><span class="card-icon">${icon(c.icon)}</span><span class="card-copy"><h3>${c.name}</h3><p>${c.desc}</p></span><span class="card-arrow">→</span></a>`).join('')};
  const switchProduct=id=>{
    if(!products[id]||id===activeProduct)return;
    activeProduct=id;const product=products[id];const visual=document.querySelector('.product-visual');const image=document.querySelector('#product-image');
    section.classList.remove('yingao-theme','tieao-theme');section.classList.add(product.theme);
    document.querySelector('#selected-product-name').textContent=product.name;
    document.querySelector('#visual-model').textContent=product.model;
    document.querySelector('#product-tagline').textContent=product.tagline;
    document.querySelector('.product-switcher').classList.toggle('is-second',id==='tieao');
    document.querySelectorAll('.product-option').forEach(button=>{const on=button.dataset.product===id;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on))});
    clearTimeout(switchTimer);visual.classList.add('switching');
    switchTimer=setTimeout(()=>{image.src=product.image;image.alt=`${product.name}产品图`;visual.classList.remove('switching')},220);
    renderCards();
  };
  renderCards();
  document.querySelectorAll('.product-option').forEach(button=>{button.addEventListener('mouseenter',()=>switchProduct(button.dataset.product));button.addEventListener('focus',()=>switchProduct(button.dataset.product));button.addEventListener('click',()=>switchProduct(button.dataset.product))});
  document.querySelector('#search-form').addEventListener('submit',e=>{
    e.preventDefault(); const q=document.querySelector('#search-input').value.trim();
    if(!q){document.querySelector('#search-input').focus();return;}
    location.href=`category.html?product=${activeProduct}&type=all&q=${encodeURIComponent(q)}`;
  });
}

function initCategory(){
  const list=document.querySelector('#article-list'); if(!list)return;
  const params=new URLSearchParams(location.search); const type=params.get('type')||'docs'; const product=products[params.get('product')]||products.yingao;
  const category=categories.find(c=>c.id===type)||{id:'all',name:'搜索结果',desc:'在全部技术资料中查找相关内容',icon:'search'};
  document.body.classList.add('product-category-page',`category-${product.id}`);
  const languageLink=document.querySelector('#language-link');if(languageLink)languageLink.href=`category-en.html?${params.toString()}`;
  document.title=`${product.name}${category.name} · 具身智人技术支持中心`;
  document.querySelector('#breadcrumb-name').textContent=`${product.name} / ${category.name}`;
  document.querySelector('#category-title').textContent=`${product.name} · ${category.name}`;
  document.querySelector('#category-description').textContent=`${product.name}${category.desc}`;
  document.querySelector('#category-icon').innerHTML=category.icon==='search'?'<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="7.2"/><path d="m16 16 5 5"/></svg>':icon(category.icon);
  const groupNames=['快速开始','产品使用','维护与排障'];
  const source=(type==='all'?categories.flatMap(c=>articleTemplates[c.id].map(a=>[...a,c.name])):articleTemplates[type].map(a=>[...a,category.name])).map((a,i)=>({id:`doc-${i}`,title:a[0],desc:a[1],tag:a[2],category:a[3],group:groupNames[i%groupNames.length],date:`2026-0${(i%8)+1}-${String((i*3)%25+1).padStart(2,'0')}`,version:`V${1+(i%2)}.${i}.0`}));
  const input=document.querySelector('#category-search-input'); input.value=params.get('q')||'';
  let selectedGroup='all';
  const tree=document.querySelector('#document-tree');
  const groups=groupNames.map(name=>({name,docs:source.filter(a=>a.group===name)})).filter(g=>g.docs.length);
  tree.innerHTML=`<button class="tree-toggle active" data-group="all"><span>▦</span>全部文档</button>`+groups.map((g,i)=>`<div class="tree-group ${i===0?'open':''}"><button class="tree-toggle" type="button"><span class="tree-chevron">›</span><span>${g.name}</span><small>(${g.docs.length})</small></button><div class="tree-children">${g.docs.map(a=>`<button class="tree-document" type="button" data-doc="${a.id}">${a.title}</button>`).join('')}</div></div>`).join('');
  tree.addEventListener('click',e=>{
    const toggle=e.target.closest('.tree-toggle'); const doc=e.target.closest('.tree-document');
    if(toggle){
      if(toggle.dataset.group==='all'){selectedGroup='all';document.querySelector('#content-title').textContent='全部内容';tree.querySelectorAll('.active').forEach(x=>x.classList.remove('active'));toggle.classList.add('active');render();}
      else{const group=toggle.closest('.tree-group');group.classList.toggle('open');selectedGroup=toggle.querySelector('span:nth-child(2)').textContent;document.querySelector('#content-title').textContent=selectedGroup;tree.querySelectorAll('.active').forEach(x=>x.classList.remove('active'));toggle.classList.add('active');render();}
    }
    if(doc){const item=source.find(a=>a.id===doc.dataset.doc);tree.querySelectorAll('.active').forEach(x=>x.classList.remove('active'));doc.classList.add('active');openPreview(item);}
  });
  document.querySelector('#expand-all').addEventListener('click',e=>{const allOpen=[...tree.querySelectorAll('.tree-group')].every(g=>g.classList.contains('open'));tree.querySelectorAll('.tree-group').forEach(g=>g.classList.toggle('open',!allOpen));e.currentTarget.textContent=allOpen?'全部展开':'全部收起'});
  const documentText=a=>`${a.title}\n\n${a.desc}\n\n版本：${a.version}\n更新日期：${a.date}\n\n一、文档说明\n本资料用于介绍${a.title}的相关功能和操作流程。\n\n二、使用前准备\n请确认设备运行正常，并按照实际产品版本选择对应资料。\n\n三、操作步骤\n1. 完成设备连接和基础配置。\n2. 按照页面提示执行相关操作。\n3. 保存配置并验证运行结果。\n\n如需进一步帮助，请联系技术支持。`;
  const download=a=>{const blob=new Blob([documentText(a)],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${a.title}-${a.version}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),500)};
  const modal=document.querySelector('#preview-modal'); let currentPreview;
  function openPreview(a){currentPreview=a;document.querySelector('#preview-title').textContent=a.title;document.querySelector('#preview-version').textContent=`${a.version} · 更新于 ${a.date}`;document.querySelector('#preview-body').innerHTML=`<h3>文档说明</h3><p>${a.desc}。本页面展示当前文档的示例预览内容。</p><div class="preview-note">当前为前端演示资料，后续接入真实文档后可直接预览 PDF、Word 或网页内容。</div><h3>使用前准备</h3><p>请确认设备状态正常，并选择与当前产品及软件版本匹配的资料。</p><h3>操作步骤</h3><p>1. 完成设备连接和基础配置。<br>2. 按照文档指引执行相关操作。<br>3. 保存配置并验证运行结果。</p>`;modal.hidden=false;document.body.style.overflow='hidden';document.querySelector('.modal-close').focus()}
  modal.addEventListener('click',e=>{if(e.target.closest('[data-close-preview]')){modal.hidden=true;document.body.style.overflow=''}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden){modal.hidden=true;document.body.style.overflow=''}});
  document.querySelector('#preview-download').addEventListener('click',()=>download(currentPreview));
  const render=()=>{
    const q=input.value.trim().toLowerCase(); let items=source.filter(a=>(selectedGroup==='all'||a.group===selectedGroup)&&`${a.title}${a.desc}${a.tag}${a.category}`.toLowerCase().includes(q));
    const sort=document.querySelector('#sort-select').value;
    if(sort==='newest')items.sort((a,b)=>b.date.localeCompare(a.date));
    if(sort==='title')items.sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));
    list.innerHTML=items.map(a=>`<article class="article-item"><span class="article-type">${a.tag}</span><span class="article-info"><h3>${a.title}</h3><p>${a.desc}</p></span><span class="article-meta">${a.version} · ${a.date}</span><span class="article-actions"><button class="preview-button" type="button" data-preview="${a.id}">预览</button><button class="article-download" type="button" data-download="${a.id}">下载</button></span></article>`).join('');
    document.querySelector('#result-count').textContent=`共 ${items.length} 条内容`;
    document.querySelector('#empty-state').hidden=items.length!==0;
  };
  list.addEventListener('click',e=>{const preview=e.target.closest('[data-preview]');const dl=e.target.closest('[data-download]');if(preview)openPreview(source.find(a=>a.id===preview.dataset.preview));if(dl)download(source.find(a=>a.id===dl.dataset.download))});
  document.querySelector('#category-search').addEventListener('submit',e=>{e.preventDefault();render()});
  document.querySelector('#sort-select').addEventListener('change',render); input.addEventListener('input',render); render();
}

initHome(); initCategory();
