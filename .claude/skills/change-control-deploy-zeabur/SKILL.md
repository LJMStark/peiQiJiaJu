---
name: change-control-deploy-zeabur
description: 涉及部署、启动脚本、生产超时、standalone 构建、反向代理、诊断生产环境 HTML 错误页或「生产样式全丢/裸 HTML」时使用；Zeabur/VPS 长驻 Node 进程的运行时契约与事故先例。不用于：本地 dev 服务问题、生成接口错误码语义（→ debug-generation-failures）、数据库连接策略（→ contract-generation-concurrency）。
---

# Zeabur/VPS 运行时契约

## 适用 / 不适用
- **适用**：改 `scripts/start-next.mjs`、Dockerfile、环境变量注入、代理配置；诊断生产超时、进程崩溃、HTML 错误页。
- **不适用**：`npm run dev` 本地问题；API 错误码语义（→ [debug-generation-failures]）；DB 直连 vs 池（→ [contract-generation-concurrency]）。

## 运行时模型（一切判断的前提）

生产 = **单个长驻 Node 进程**：`npm run start` → `scripts/start-next.mjs`。不是 serverless、不是 edge。三条推论：

1. **没有函数超时**。长请求（AI 生成十几秒）只受反向代理和客户端超时约束，不存在 `FUNCTION_INVOCATION_TIMEOUT` 这种东西。
2. **内存态跨请求共享**（当前单实例）。但并发控制仍然放在 PG advisory lock 而不是内存——因为不承诺永远单实例（→ [contract-generation-concurrency]）。
3. **`maxDuration` / `vercel.json` 在这里无效且有毒**。血证：`81b8ad3` 携带 `maxDuration = 300` 被 `8577add` 整体回滚（→ [archaeology-costly-failures] 案例②）。AGENTS.md §16 写了结论，本文档记的是代价。PR 里出现这些构造，直接打回。

## 启动脚本的不可省步骤

`start-next.mjs` 实际逻辑：存在 `.next/standalone/server.js` → **先 `await syncStandaloneAssets(projectRoot)` 再**启动 standalone server；否则回退 `next start`。

- `syncStandaloneAssets`（`scripts/start-next-assets.mjs`）**不能删、不能跳过**：Next standalone 输出不自带 `public/` 与 `.next/static`，漏同步 = 生产裸 HTML 无样式。`cb35b2d`（2026-03-20）就是这次事故的修复，现在有守护测试 `tests/start-next-assets.test.mjs`。
- `PORT` 由环境注入（默认 3000）。`84fef7a` 修过 Zeabur 启动探针因端口不对而失败的问题——改端口逻辑前先想想探针。

## 生产 HTML 错误页诊断树（最常用）

应用层承诺：所有 API 错误都是 JSON 信封 `{code, message, error}`（→ [contract-api-auth-envelope]），客户端 `readJson` 遇到非 JSON 会抛中文可读错误（`1c1fc95`）。

所以用户看到 `<!DOCTYPE` / HTML 错误页 ⇒ **一定不是应用代码返回的** ⇒ 按序检查：
1. Zeabur 边缘路由（查 Zeabur 控制台日志）；
2. 上游反向代理超时/缓冲；
3. Node 进程崩溃或重启中（看进程日志时间线）。

不要去 Vercel 找答案，不要用 `maxDuration` 去「修」它。

## 出网代理

Gemini 流量可选走代理：`instrumentation.ts` 用 undici `ProxyAgent`（`05ec2e2` 引入），由环境变量控制开关。生成请求集体挂起时，先查代理可达性再怀疑 Gemini 本身。

## 健康检查

`GET|HEAD /api/healthz` → 200 纯文本 `ok`，`force-dynamic` + `no-store`。探活失败的排查顺序：进程没起来（看 start-next.mjs 输出）→ 端口不对（PORT 环境变量）→ 边缘路由。

## 姊妹文档
- HTML 错误页背后的信封契约 → [contract-api-auth-envelope]
- maxDuration 事故全文 → [archaeology-costly-failures]
- 生成请求本身的错误码 → [debug-generation-failures]
