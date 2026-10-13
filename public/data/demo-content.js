(function () {
  const items = [
    ['documents.product-usage', '产品使用指南', 'Product Usage Guide', '产品使用说明与操作指南', 'Product instructions and operating guide', '指南', 'Guide'],
    ['documents.specifications', '产品规格参数说明', 'Product Specifications', '产品硬件规格、接口定义及环境要求', 'Hardware, interfaces and operating requirements', '文档', 'Document'],
    ['sdk.download', '开发资料', 'Development Resources', '开发套件与相关资料', 'Development kits and related resources', 'SDK', 'SDK'],
    ['sdk.quick-start', '开发指南', 'Development Guide', '开发环境配置与接入指南', 'Development setup and integration guide', '开发指南', 'Dev Guide'],
    ['firmware.stable', '最新稳定版固件', 'Latest Stable Firmware', '推荐用于正式环境的稳定固件版本', 'Recommended stable release for production', '固件', 'Firmware'],
    ['faq.general', '常见问题', 'Frequently Asked Questions', '常见问题与解决方法', 'Common questions and solutions', 'FAQ', 'FAQ'],
  ];

  globalThis.SUPPORT_DEMO_CONTENT = Object.freeze(['yingao', 'tieao'].flatMap((productKey) =>
    items.map((item, index) => Object.freeze({
      id: `${productKey}-demo-${index + 1}`,
      product_key: productKey,
      category_key: `${productKey}.${item[0]}`,
      title_zh: item[1],
      title_en: item[2],
      description_zh: item[3],
      description_en: item[4],
      tag_zh: item[5],
      tag_en: item[6],
      version: `V${1 + (index % 2)}.${index}.0`,
      updated_at: `2026-${String((index % 8) + 1).padStart(2, '0')}-${String((index * 3) % 25 + 1).padStart(2, '0')}`,
    }))
  ));
})();
