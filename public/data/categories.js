(function () {
  const products = ['yingao', 'tieao'];
  const definitions = [
    {
      parent_key: 'documents',
      name_zh: '产品文档',
      name_en: 'Product Documentation',
      children: [
        ['quick-start', '快速开始', 'Getting Started'],
        ['product-usage', '产品使用', 'Product Usage'],
        ['specifications', '规格参数', 'Specifications'],
        ['safety', '安全说明', 'Safety Instructions'],
        ['maintenance', '维护与保养', 'Maintenance & Care'],
      ],
    },
    {
      parent_key: 'sdk',
      name_zh: 'SDK与开发',
      name_en: 'SDK & Development',
      children: [
        ['quick-start', '快速接入', 'Quick Integration'],
        ['download', 'SDK下载', 'SDK Downloads'],
        ['api', 'API参考', 'API Reference'],
        ['examples', '示例代码', 'Sample Code'],
        ['compatibility', '版本兼容', 'Version Compatibility'],
      ],
    },
    {
      parent_key: 'firmware',
      name_zh: '固件下载',
      name_en: 'Firmware Downloads',
      children: [
        ['stable', '正式版本', 'Stable Releases'],
        ['beta', '测试版本', 'Beta Releases'],
        ['upgrade-guide', '升级说明', 'Upgrade Instructions'],
        ['release-notes', '更新日志', 'Release Notes'],
        ['archive', '历史版本', 'Previous Releases'],
      ],
    },
    {
      parent_key: 'video',
      name_zh: '教学视频',
      name_en: 'Video Tutorials',
      children: [
        ['quick-start', '快速上手', 'Getting Started'],
        ['operations', '功能操作', 'Feature Operations'],
        ['development', '二次开发', 'Secondary Development'],
        ['troubleshooting', '故障排查', 'Troubleshooting'],
      ],
    },
    {
      parent_key: 'faq',
      name_zh: '常见问题',
      name_en: 'Frequently Asked Questions',
      children: [
        ['network', '网络与连接', 'Network & Connectivity'],
        ['product-usage', '产品使用', 'Product Usage'],
        ['sdk', 'SDK与开发', 'SDK & Development'],
        ['firmware', '固件升级', 'Firmware Upgrades'],
        ['troubleshooting', '故障排查', 'Troubleshooting'],
      ],
    },
    {
      parent_key: 'tools',
      name_zh: '工具与资源',
      name_en: 'Tools & Resources',
      children: [
        ['configuration', '配置工具', 'Configuration Tools'],
        ['upgrade', '升级工具', 'Upgrade Tools'],
        ['logs-diagnostics', '日志与诊断', 'Logs & Diagnostics'],
        ['drivers-dependencies', '驱动与依赖', 'Drivers & Dependencies'],
        ['other-resources', '其他资源', 'Other Resources'],
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
