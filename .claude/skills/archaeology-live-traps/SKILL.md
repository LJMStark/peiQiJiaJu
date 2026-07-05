---
name: archaeology-live-traps
description: 当前代码里仍然活着的地雷、技术债与死代码索引，改到相关文件前查一眼，避免踩雷或误「顺手修」；接到清理/优化/删死代码类任务先对照本清单立项；含头号债（历史无分页）与密钥兜底引信。不用于：了解事故来龙去脉（→ archaeology-costly-failures）、变更流程纪律（→ change-control-hot-zones）。
---

# 现役地雷索引（2026-07 审计基线）

## 适用 / 不适用
- **适用**：动手改某文件前查它是否带雷；接到「清理/优化」类任务时对照本清单立项。
- **不适用**：想知道雷是怎么埋下的（→ [archaeology-costly-failures]）；改动流程与提交纪律（→ [change-control-hot-zones]）。

**使用原则**：除非任务本身就是拆雷，否则**只绕行、不顺手修**（热区纪律）。拆雷 = 独立提交。

## 按危险度排列

1. **【安全引信】密钥兜底**：`lib/server/gemini.ts:53` 存在 `GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY` 兜底。今天没泄漏（该变量无人设置、文件仅服务端），但谁在环境里真设了 `NEXT_PUBLIC_GEMINI_API_KEY`，付费密钥就会被打进浏览器 bundle。拆法：删兜底分支（一行）。`.env.example` 不含此变量是**正确状态**，别「补全」它。
2. **【CSRF/预取隐患】GET 写库**：`app/i/[code]/route.ts` 在 GET 处理器里调 `claimInviteFromLink` 修改邀请状态。recovery 计划 Task 5（改显式 POST）未完成。爬虫/预取可能提前消费 late-claim 窗口。
3. **【头号性能债】历史无分页**：`app/api/history/route.ts` → `listHistoryItems`（`lib/server/assets.ts:533`）全量 SELECT + 每行 3 次以上签名 URL。曾有完整分页实现被整体回滚（→ [archaeology-costly-failures] 案例②）。重做要点：单独提交、cursor 分页、只签当前页。
4. **【反直觉】S3 客户端只在非生产 memoize**：`lib/server/s3-client.ts` 的缓存条件疑似写反，生产每次请求重建客户端。改它之后必须手测上传/下载/历史缩略图三连。
5. **【配置迷宫】四套 DB 连接串策略并存**：`lib/db.ts`（`DATABASE_URL ?? DIRECT_URL`）、`lib/auth.ts`（`preferDirect` 开关）、`lib/server/generation-concurrency.ts`（优先 `DIRECT_URL`，**有铁律原因**，见 [contract-generation-concurrency]）、`lib/db-config.ts` 的 `resolveDatabaseConnectionString`（写好但全库无调用 = 死代码）。新代码别发明第五套；将来统一时不得破坏并发锁的直连要求。
6. **【静默清理】8 处 `.catch(() => undefined)` 无日志**（2026-07 grep 实数）：其中 **6 处是 R2 对象清理**（`assets.ts:338/:480/:698/:702`、`storage.ts:261`、`room-image-cleanup.ts:13`），另 2 处是 `assets.ts:417/:479` 的事务 ROLLBACK 兜底（同模式、不同性质）。R2 清理失败的孤儿对象零遥测——新写的清理代码必须记录 storage path（ROLLBACK 兜底不在此列）。
7. **【死代码区】**（删除请作为独立清理提交）：`lib/supabase-admin.ts`、`lib/client/image-utils.ts`、`lib/utils.ts`（`cn()` 全库未用）、`db-config.ts` 的 `resolveDatabaseConnectionString`、`generation-history-schema.ts` 的 legacy 写变体（构造了从未选用）。死依赖：`firebase-tools`、`date-fns`、`class-variance-authority`、`@hookform/resolvers`、`tw-animate-css`；`@supabase/supabase-js` 仅剩死模块与过时迁移脚本在引用。
8. **【工具链】**：双 ESLint 配置并存（旧 `.eslintrc.json` + 平配置 `eslint.config.mjs`，ESLint 9 只认后者）；`eslint-config-next@16` vs `next@15` 版本错位；`package.json` 缺 `"type": "module"`（测试有性能警告）；无 `npm test` 别名；**无任何 CI**。
9. **【文档朽坏】**：`docs/plans/` 两份 supabase-storage 计划已废未标注；`DEVELOPMENT.md` 仍描述已删除的「首次进入选 API key」流程；`storage:migrate` 与 `storage:migrate:history-schema` 指向同一文件。
10. **【UI 债】**（完整名单以本条为准，不扩散规则见 [acceptance-ui-changes]）：假进度条（`RoomEditorResultPanel.tsx:178` 写死 75%）、admin 整页 gray 灰阶、8 个弹窗无 a11y、全局 `error.tsx` / `not-found.tsx` 英文文案、`Dashboard.tsx:147,228` 两处英文兜底、`Catalog.tsx:67` 泄漏「Supabase Storage」字样、成功色 green/emerald 混用（emerald 为准）、`rounded-[28px]` 任意值圆角反例。

## 姊妹文档
[archaeology-costly-failures]（雷的来历）· [change-control-hot-zones]（拆雷纪律）· [contract-generation-concurrency] · [acceptance-ui-changes]
