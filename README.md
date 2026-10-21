# Goalward 官网

[goalward.dev](https://goalward.dev) 的静态站点。页面介绍开源 macOS 应用 [Goalward](https://github.com/Beace/goalward)：把一个方向整理成目标、任务和证据，再交给你本机已经安装的编程 Agent。

默认语言是中文。浏览器语言以 `en` 开头时首次打开为英文，导航里可以切换。下载链接在浏览器里读取 [`https://releases.goalward.dev/latest.json`](https://releases.goalward.dev/latest.json)；发布桶没有 CORS 头，所以同源的 `/api/latest.json` 由 Worker 转发。读不到清单时，按钮仍指向构建这份页面时的版本 **0.7.2**（2026-10-21 的 `latest.json`。任务说明里写的 0.7.1 已被这次发布覆盖）。

# Goalward website

Static site for [goalward.dev](https://goalward.dev). It introduces [Goalward](https://github.com/Beace/goalward), the free open-source macOS app that turns a direction into a goal, tasks, and evidence, then runs the coding agents already installed on that Mac.

Chinese is the default. A first visit uses English when `navigator.language` starts with `en`. The nav can switch. Download links read [`https://releases.goalward.dev/latest.json`](https://releases.goalward.dev/latest.json) in the browser. That bucket does not send CORS headers, so the Worker proxies it at `/api/latest.json`. If the manifest cannot be read, the buttons keep the version baked into this page: **0.7.2** (the manifest on 2026-10-21).

## 本地开发 / Local development

需要 Node.js 22 或更新版本。

```bash
npm ci
npm run dev
```

开发服务器会把 `/api/latest.json` 代理到 `https://releases.goalward.dev/latest.json`。打开 [http://localhost:5173](http://localhost:5173)。

## 构建 / Build

```bash
npm run build
```

类型检查通过后，Vite 把站点输出到 `dist/`。预览构建结果：

```bash
npm run preview
```

`vite preview` 没有开发服务器的代理。这时下载按钮会尝试直接请求 `latest.json`，被 CORS 拦住后保留页面里的 0.7.2 链接。正式环境由 Worker 提供 `/api/latest.json`。

## 部署 / Deploy

Cloudflare Workers 静态资源，配置在 `wrangler.jsonc`。

- Worker 名称：`goalward-home`
- 资源目录：`dist/`
- 自定义域：`goalward.dev` 与 `www.goalward.dev`
- `www.goalward.dev` 由 `worker/index.js` 301 到 `https://goalward.dev`（保留路径和查询字符串）
- `workers.dev` 子域已关闭

本机发布（需已登录或已设置下面的环境变量）：

```bash
npm run deploy
```

推送到 `main` 时，`.github/workflows/ci.yml` 会构建并执行 `npx wrangler deploy`。Pull request 只跑构建。

### GitHub Actions secrets

在仓库的 Settings → Secrets and variables → Actions 添加，不要写进代码：

| Secret | 内容 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 下面权限的 Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | 拥有 `goalward.dev` 这个 zone 的 Cloudflare account ID |

任一 secret 为空时，部署步骤会失败并写明缺的是哪一个，不会调用 `wrangler deploy`。Account ID 在 Cloudflare 控制台打开 `goalward.dev` 的 Overview，右侧可以看到。

### Cloudflare API token 权限

Token 只授予拥有 `goalward.dev` 的那个账号，zone 资源只包括 `goalward.dev`。

首次 `wrangler deploy` 会创建 Worker `goalward-home`，并挂上两个自定义域。按 2026-10 的 Cloudflare 文档，权限是：

**Account**

- **Workers Scripts — Edit**（旧名 Workers Scripts Write）。如果控制台已经改成 Workers 角色：尚不存在的 Worker，创建它需要产品级 **Workers Admin**；已经存在的 Worker，再次部署需要该 Worker 的 **Editor**。
- **Account Settings — Read**。Wrangler 用它确认账号。

**Zone，仅 `goalward.dev`**

- **Workers Routes — Edit**（Workers Routes Write）。自定义域的添加和更新需要它。

**User**（「Edit Cloudflare Workers」模板会带上，Wrangler 用来识别 token）

- **User Details — Read**
- **User Memberships — Read**

可以从模板 **Edit Cloudflare Workers** 开始，再把资源收窄到这个账号和 `goalward.dev`。该模板还会带上 Workers KV Storage Write、Workers R2 Storage Write 和 Workers Tail Read。这个站点不用 KV、R2 或 Tail，去掉它们也可以。

自定义域由 Cloudflare 创建 DNS 记录和证书。文档写明这件事不需要 DNS Write。不要给 token 额外的账号级管理权限。

## 素材 / Assets

图标和截图复制自 [Beace/goalward](https://github.com/Beace/goalward)：

- `src-tauri/icons/32x32.png`、`128x128.png`、`icon.png` → `public/brand/` 与 `public/favicon.ico`、`public/og.png`
- `screenshots/goalward-goals-en.png`
- `screenshots/goalward-workbench-en.png`
- `screenshots/goalward-appearance-en.png`

仓库说明这些截图是 1536×960 的当前界面和示例数据，不展示实时 Agent 执行。页面上的场景卡片是用法举例，不是用户证言。

## 更新页面里的回退版本 / Fallback version

发布新版本后不必改这个网站，浏览器会读 `latest.json`。只有在清单暂时读不到时才会用到 HTML 里的 `0.7.2` 链接。若要更换回退版本，一起改：

- `index.html` 里所有 `Goalward_0.7.2_macos-universal.dmg` 链接和 `.js-version`
- `index.html` 里 JSON-LD 的 `softwareVersion` 与 `downloadUrl`
