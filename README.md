# KEN TV · Cloudflare Pages

适用于原有 `yuiyuki.pages.dev` 项目的 KEN TV 完整版本，包含浅紫界面、手机和电脑布局、12 个直连视频源、今日动漫更新、片单、观看记录与下载当前集。

本仓库根目录已经包含编译好的首页、assets、图片及 `_worker.js` 后端，不需要登录 ChatGPT。将整个仓库作为原 Pages 项目的发布内容即可保留原域名。

## 原 Pages 项目设置

| 项目 | 设置 |
| --- | --- |
| GitHub 仓库 | 原来的 Yuiyuki95/Yuiyuki |
| 正式分支 | main |
| 构建命令 | 留空 |
| 构建输出目录 | `/`（仓库根目录） |
| 框架 | None |

不要删除 Pages 项目或更改项目名，原来的 `yuiyuki.pages.dev` 会继续使用。旧版备份分支：`backup/libretv-before-ken-tv-20261025`。

`_worker.js` 使用 Pages 高级模式：搜索、更新和下载与网页同域运行。以前的 `/functions` 内容不再需要。

如果 Cloudflare 原来配置了 `PASSWORD`，新版保留相同的网站密码，并通过服务器校验后发放 HttpOnly 安全 Cookie；密码不会发送到前端脚本。没有设置 PASSWORD 时直接进入网站。退出访问：打开 `/__ken/logout`。

## 更新源码后重新编译

源码在 `ken-tv-source/`，需要 Node.js 22.13+ 和 pnpm 11.25：

```bash
cd ken-tv-source
pnpm install --frozen-lockfile
pnpm build
pnpm check
```

构建脚本会更新根目录的预编译文件，提交根目录与源码的所有变更后，Cloudflare 会自动重新部署。无需在 Cloudflare 添加 API Token。

## 功能与范围

- 12 个 CMS 片源直接连接：如意、无尽、360、极速、红牛、暴风、量子、魔都、最大、百度云、虎牙、非凡。添加和查询时会检测兼容性，源站可能随时变动。
- CMS JSON、CMS XML、自定义 JSON 和 M3U；自定义接口、批量导入/导出、连接检查。
- 关键词搜索最多 4 路并发，显示每源状态与数量；相同片名和年份合并，可按源查看。
- 今日更新按 Asia/Kuala_Lumpur（UTC+8）筛选当天动漫，首页读取前 3 个启用源；每 5 分钟刷新。
- 视频文件直链下载；未加密、已结束的 M3U8 可合并为 TS/fMP4，支持进度、取消与重试；合并上限 350 MB，普通文件下载上限 2 GB。源站可能拒绝下载。
- 不执行第三方解析脚本，不绕过登录、付费或 DRM。远程接口只接受公开 HTTPS 地址，并检查 DNS 与重定向。
- 观看记录、收藏和视频源保存在当前浏览器，不会自动跨设备同步。

应用代码为 MIT；依赖与 Blender 示例媒体许可见 THIRD_PARTY_NOTICES.md。旧 LibreTV 源码保存在备份分支和 Git 历史中。
