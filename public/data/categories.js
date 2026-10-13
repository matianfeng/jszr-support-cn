(function () {
  const products = ['yingao', 'tieao'];
  const definitions = [
    {
      parent_key: 'documents',
      name_zh: '产品文档',
      name_en: 'Product Documentation',
      children: [
        ['product-usage', '产品使用', 'Product Usage'],
        ['specifications', '规格参数', 'Specifications'],
      ],
    },
    {
      parent_key: 'sdk',
      name_zh: 'SDK与开发',
      name_en: 'SDK & Development',
      children: [
        ['download', '开发资料', 'Development Resources'],
        ['quick-start', '开发指南', 'Development Guide'],
      ],
    },
    {
      parent_key: 'firmware',
      name_zh: '固件下载',
      name_en: 'Firmware Downloads',
      children: [
        ['stable', '正式版本', 'Stable Releases'],
      ],
    },
    {
      parent_key: 'faq',
      name_zh: '常见问题',
      name_en: 'Frequently Asked Questions',
      children: [
        ['general', 'FAQ', 'FAQ'],
      ],
    },
  ];

  const nodes = [];
  products.forEach((productKey) => {
    definitions.forEach((parent, parentIndex) => {
      nodes.push({
        product_key: productKey,
        parent_key: parent.parent_key,
        category_key: null,
        name_zh: parent.name_zh,
        name_en: parent.name_en,
        sort_order: (parentIndex + 1) * 100,
        node_type: 'parent',
      });
      parent.children.forEach(([suffix, nameZh, nameEn], childIndex) => {
        nodes.push({
          product_key: productKey,
          parent_key: parent.parent_key,
          category_key: `${productKey}.${parent.parent_key}.${suffix}`,
          name_zh: nameZh,
          name_en: nameEn,
          sort_order: (parentIndex + 1) * 100 + childIndex + 1,
          node_type: 'category',
        });
      });
    });
  });

  globalThis.SUPPORT_CATEGORIES = Object.freeze(nodes.map(Object.freeze));
})();
