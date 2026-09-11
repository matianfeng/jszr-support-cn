# 技术支持门户部署说明

## 项目类型

本项目为纯静态网站，无需安装 Node.js、数据库或其他运行依赖。

## 入口页面

- `index.html`：中文首页
- `en.html`：英文首页
- `category.html`：中文资料二级页
- `category-en.html`：英文资料二级页

## 部署方法

将压缩包解压后，把目录内的全部文件和 `assets` 文件夹原样上传到网站根目录即可。

可部署到 Nginx、Apache、IIS、对象存储静态托管或其他静态网站服务。默认入口设置为 `index.html`。

## Nginx 最简示例

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/support-portal;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 注意事项

- 上传时需保留当前目录结构和文件名。
- 当前“联系支持”邮箱为 `support@example.com`，正式发布前请替换为真实邮箱。
- 当前文档内容和下载文件为前端演示数据，后续可在 `app.js` 与 `app-en.js` 中接入真实资料地址或接口。
- 网站路径包含中文不会影响源码，但服务器部署目录建议使用英文名称，例如 `support-portal`。
