# 技术支持门户部署说明

## 项目类型

本项目采用 Cloudflare Worker 后端入口 + Static Assets 架构。网页由 `env.ASSETS.fetch(request)` 提供，并绑定 Cloudflare R2 存储桶。

## 入口页面

- `public/index.html`：中文首页
- `public/en.html`：英文首页
- `public/category.html`：中文资料二级页
- `public/category-en.html`：英文资料二级页
- `src/index.js`：Cloudflare Worker 入口
- `wrangler.jsonc`：Worker、Static Assets 与 R2 绑定配置

## 部署方法

```bash
npm install
npm run check
npm run deploy
```

GitHub 自动部署时，Cloudflare 的部署命令可配置为 `npx wrangler deploy`。

## Cloudflare 配置

- Worker 名称：`jszrwz`
- Worker 入口：`src/index.js`
- 静态资源目录：`public`
- 静态资源绑定：`ASSETS`
- R2 存储桶：`jszr-support-files`
- R2 绑定变量：`SUPPORT_FILES`
- D1 数据库：`wendang`
- D1 绑定变量：`DB`

## 注意事项

- 部署时需保留当前目录结构和文件名。
- 当前“联系支持”邮箱为 `support@example.com`，正式发布前请替换为真实邮箱。
- 当前文档内容和下载文件为前端演示数据，后续可在 `app.js` 与 `app-en.js` 中接入真实资料地址或接口。
- 网站路径包含中文不会影响源码，但服务器部署目录建议使用英文名称，例如 `support-portal`。
