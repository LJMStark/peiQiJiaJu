---
name: contract-api-auth-envelope
description: 新增或修改任何 API 路由、server action、客户端请求代码时必须遵守的鉴权拓扑与错误信封契约：全站无 middleware、逐路由守卫、{code,message,error} 信封、公开端点白名单只有四个。不用于：登录/邀请行为异常排查（→ debug-auth-and-invites）、生成错误码语义（→ debug-generation-failures）。
---

# API / 鉴权 / 信封契约

## 适用 / 不适用
- **适用**：新建 API 路由或 server action、改鉴权判断、改错误返回、写客户端请求代码。
- **不适用**：排查登录/被踢/归因问题（→ [debug-auth-and-invites]）；某个具体错误码什么意思（→ [debug-generation-failures]）。

## 鉴权拓扑（关键前提：**没有 `middleware.ts`**）

全站没有边缘统一守卫，鉴权逐点落地，只有三种合法模式：

1. **用户 API 路由**：第一行 `requireVerifiedRequestSession(request)`（`lib/auth-session.ts`）→ 无会话 401、未验证邮箱 403。现有 12 条受保护路由全部这么写，新路由照抄，不要发明第四种。
2. **admin 面**：页面层 `app/admin/layout.tsx` 做 `redirect`；动作层每个 server action 首行 `await checkAdmin()`（`app/actions/admin.ts`）。**注意**：`/api/admin/*` 路由本身没有守卫，安全性完全依赖其调用的 action 内部的 `checkAdmin` —— 新 admin 端点若不经 action，必须自带守卫。admin 判定 = `"user".role === 'admin'`（数据库列，不是环境变量）；授予用 `node --env-file=.env scripts/set-admin.mjs`。
3. **公开白名单（仅四个，新增即架构决定）**：`/api/auth/[...all]`（better-auth 接管）、`POST /api/invitations/signup`（唯一公开变更端点，注册唯一门 → [debug-auth-and-invites]）、`/api/healthz`、`GET /i/[code]`（注意它有在册的 GET 写库隐患 → [archaeology-live-traps] #2）。

## 错误信封

- 统一形态 `{ code, message, error }`（`message` 与 `error` 同文案，客户端读 `error`），由 `createErrorEnvelope` 构造（`lib/server/http/error-envelope.ts`）；抛错载体 `RouteError` 携带 `status/code/expose`。
- 路由层用现成工具（`errorResponse` / error-envelope 系列），**不手写** `NextResponse.json({ message })` 之类的私有格式。
- `code` 用 SCREAMING_SNAKE 语义码（先例见 [debug-generation-failures] 速查表）；`error` 文案面向用户、简体中文、不泄内部细节（禁止把原始堆栈/SQL/厂商名塞进 error）。
- **应用层永不返回 HTML 错误**——这是生产诊断树的地基（→ [change-control-deploy-zeabur]：见到 HTML 必是边缘层或进程崩溃）。

## 客户端配套

- 一律用 `lib/client/api.ts` 的 `readJson` / `requestJson` / `postJson`：`readJson` 对非 JSON 响应抛中文可读错误（`1c1fc95`），对信封响应抛出其中的 `error` 文案。
- room-editor 控制器里现存的 7 处裸 `fetch` 是历史欠账（在册），**新代码不要模仿**。
- 客户端变更走 API 路由，不得 import `app/actions/*`（AGENTS.md §11 的规矩；守护测试 `tests/client-boundaries.test.ts` 会抓违规）。

## 输入校验

- 路由入参走 `lib/server/http/request-parsers.ts` 的模式（`3d3b1dc` 统一）。
- **拒绝客户端提供的存储路径/指针**：先例是 generation 输入解析拒收客户端传来的 storage pointer（防越权访问他人资产，`7090277` 属主锁同一战役）。新端点凡接受 id，必须校验归属。

## 姊妹文档
[debug-auth-and-invites] · [debug-generation-failures]（错误码先例）· [change-control-deploy-zeabur]（HTML 错误页诊断）· [acceptance-code-changes]（新端点的验收要求）
