(function () {
  const items = [
    ['documents.quick-start', '快速入门指南', 'Quick Start Guide', '帮助您完成设备开箱、连接与首次配置', 'Unbox, connect and configure your device', '指南', 'Guide'],
    ['documents.specifications', '产品规格参数说明', 'Product Specifications', '产品硬件规格、接口定义及环境要求', 'Hardware, interfaces and operating requirements', '文档', 'Document'],
    ['documents.safety', '安全使用与维护手册', 'Safety & Maintenance Manual', '设备日常使用、维护和安全注意事项', 'Safety guidance and routine maintenance', '手册', 'Manual'],
    ['documents.product-usage', '网络连接配置指南', 'Network Configuration Guide', '有线网络与无线网络的配置方法', 'Configure wired and wireless connectivity', '指南', 'Guide'],
    ['sdk.quick-start', 'SDK快速接入指南', 'SDK Quick Start', '完成开发环境配置并运行第一个示例', 'Set up the environment and run your first sample', '开发指南', 'Dev Guide'],
    ['sdk.api', 'API接口参考', 'API Reference', '核心能力接口、参数与返回值说明', 'Core APIs, parameters and return values', 'API', 'API'],
    ['sdk.download', 'Python SDK下载与说明', 'Python SDK Downloads', '适用于Python项目的开发套件', 'Development kit for Python projects', 'SDK', 'SDK'],
    ['sdk.examples', '示例代码合集', 'Sample Code Collection', '常见业务场景的可运行示例', 'Runnable examples for common scenarios', '代码', 'Code'],
    ['firmware.stable', '最新稳定版固件', 'Latest Stable Firmware', '推荐用于正式环境的稳定固件版本', 'Recommended stable release for production', '固件', 'Firmware'],
    ['firmware.upgrade-guide', '固件升级操作说明', 'Firmware Upgrade Guide', '在线与离线升级的完整操作步骤', 'Online and offline upgrade instructions', '指南', 'Guide'],
    ['firmware.release-notes', '版本更新日志', 'Release Notes', '查看固件版本功能更新与问题修复', 'Features, improvements and fixes', '日志', 'Release'],
    ['firmware.archive', '历史版本归档', 'Previous Releases', '下载仍在维护期内的历史版本', 'Supported historical firmware versions', '固件', 'Firmware'],
    ['video.quick-start', '设备快速上手', 'Device Quick Start', '从开箱到完成首次任务的完整演示', 'From unboxing to the first task', '视频', 'Video'],
    ['video.development', '开发环境配置', 'Development Setup', 'SDK安装和开发工具配置演示', 'SDK installation and tool configuration', '视频', 'Video'],
    ['video.operations', '核心功能操作演示', 'Core Feature Demo', '常用功能的操作方法与注意事项', 'Common features and best practices', '视频', 'Video'],
    ['video.troubleshooting', '故障排查教程', 'Troubleshooting Tutorial', '定位常见连接及运行问题', 'Diagnose connectivity and runtime issues', '视频', 'Video'],
    ['faq.network', '设备无法连接怎么办？', 'Device will not connect', '网络、供电和设备状态的排查方法', 'Check network, power and device status', '热门', 'Popular'],
    ['faq.product-usage', '如何恢复出厂设置？', 'How to factory reset', '恢复前注意事项与标准操作步骤', 'Precautions and reset procedure', '操作', 'How-to'],
    ['faq.sdk', 'SDK初始化失败', 'SDK initialization failed', '环境依赖与权限配置问题排查', 'Dependencies and permission troubleshooting', '开发', 'Development'],
    ['faq.troubleshooting', '在哪里查看设备日志？', 'Where are device logs', '日志导出、查看和反馈方法', 'Export, inspect and submit logs', '诊断', 'Diagnostics'],
    ['tools.configuration', '设备配置工具', 'Device Configuration Tool', '设备发现、网络及基础参数配置', 'Discover devices and configure basic settings', '工具', 'Tool'],
    ['tools.logs-diagnostics', '日志分析工具', 'Log Analysis Tool', '快速解析设备运行日志并生成报告', 'Parse runtime logs and generate reports', '工具', 'Tool'],
    ['tools.other-resources', '开发者资源包', 'Developer Resource Pack', '图标、接口示例及调试资源合集', 'Icons, API examples and debugging assets', '资源', 'Resource'],
    ['tools.logs-diagnostics', '命令行调试助手', 'CLI Debug Assistant', '用于设备诊断与接口联调的命令行工具', 'Command-line utility for diagnostics and API testing', '工具', 'Tool'],
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
