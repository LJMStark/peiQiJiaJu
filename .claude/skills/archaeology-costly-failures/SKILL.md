---
name: archaeology-costly-failures
description: 做技术选型、平台相关配置、大规模重构立项之前读的历史事故档案：存储选型返工、分页回滚、Vercel 心智税三大案例与再犯检测清单。不用于：查当前仍活着的地雷与债（→ archaeology-live-traps）、日常变更纪律（→ change-control-hot-zones）。
---

# 事故考古档案

## 适用 / 不适用
- **适用**：技术选型（存储/队列/第三方服务）、想做跨多文件的大重构、想加平台级配置、或想理解「这条规矩为什么存在」。
- **不适用**：查现在还没修的坑（→ [archaeology-live-traps]）；提交纪律速查（→ [change-control-hot-zones]）。

## 案例① 存储选型返工 —— 绝对工作量最大

- **时间线**：`822060a`（2026-03-14，项目诞生当天）资产层落在 Supabase Storage → 17 天后 `19fd7ec`（03-31）整体迁 Cloudflare R2，单提交 **+4058/−2091 行、9 个文件** → 连环修：`b72b0f7`（remotePatterns 漏 R2 域名，全站图裂）、`f9cbec2`（keep-alive agent + 显式 smithy 依赖修连接稳定性）、`8430c3a`（下载改走应用代理）。
- **根因**：选型时没算带宽账。Supabase 出网费扛不住高清效果图流量（README 自述「带宽危机」），R2 免出网费才是对的答案。
- **遗迹**：`docs/plans/2026-03-14-supabase-storage*` 两份作废设计文档已标废弃，仅作历史记录。`lib/supabase-admin.ts`、`migrate-storage-assets.mjs` 里的 Supabase 桶段落、`@supabase/supabase-js` 依赖已在 2026-07-06 清理。`19fd7ec` 曾附带 `migrate-storage-to-r2.mjs`，后被清理提交删除——**任何文档引用该脚本都是过时信号**。
- **再犯检测**：任何「选个 X 服务」的决策，先做单位经济测算（带宽/出网/请求单价 × 预估量），写进 `docs/plans/` 再动手。

## 案例② 分页回滚 —— 单位时间损失最大、唯一仍在计息

- **时间线**：03-30 16:44 `81b8ad3`「paginate history loading and extend generate timeout」+604/−52、12 文件；同日 19:19 `8577add` 整体 revert。**存活 2.5 小时**。
- **死因解剖**：(a) 捆绑毒丸——`maxDuration = 300` 是 Vercel 语义，与 Zeabur 长驻进程模型冲突；(b) 落点危险——直接压在 +1072 行并发提交（`1db03e0`，03-25 合入，81b8ad3 的直接父提交）之上，同时重写 `assets.ts` 203 行；(c) 回滚后没留尸检文档，分页需求就地蒸发。
- **利息**：至今 `listHistoryItems` 全量加载 + 每行 3 次以上签名 URL，活跃用户历史越多打开越慢（→ [archaeology-live-traps] #3）。
- **再犯检测**：单事项提交（→ [change-control-hot-zones]）；回滚必须留尸检记录到 `docs/plans/`；平台相关配置永远单独提交并先对照 [change-control-deploy-zeabur]。

## 案例③ Vercel 心智税 —— 最阴险（持续损耗而非单次事故）

- **表现**：`maxDuration` 毒丸（正是案例②的死因之一）；生产 HTML 错误页被按「serverless 冷启动/函数超时」误诊，浪费排查时间；直到 `9dbf5c0` + AGENTS.md §16 成文才止血。
- **教训**：部署平台假设是架构级决定，必须写进共享文档，不能留在某个人（或某次 agent 会话）的脑子里。
- **再犯检测**：diff 中出现 `maxDuration`、`vercel.json`、edge runtime 假设 = 直接打回（→ [change-control-deploy-zeabur]）。

## 荣誉提名：台账直写窗口（near-miss，差点最贵）

`e5eb31b`（03-21 recovery 周）之前 `/api/history` 存在 POST——客户端可以直写 `generation_history`。而这张表是计费台账（credit = 行数），伪造历史、操纵额度基数的口子开了约一周，在 recovery 中关闭（历史写入内化进 generation service）。**教训：台账类表永远不给客户端写路径**（→ [contract-credit-ledger]）。

## 背景：backend recovery 计划只完成了一半

`docs/plans/2026-03-21-backend-architecture-recovery.md` 的 8 个任务：安全侧 4 个已交付（错误信封 `3d3b1dc`、生成属主锁 `7090277`、history 只读化 `e5eb31b`、清除运行时 DDL `caf62e3`）；结构侧 4 个烂尾（拆 `assets.ts`、invite claim POST 化、抽 admin-service、拆 `Dashboard.tsx`）。接手这些烂尾任务前，先读本档案理解它们为什么停。

## 姊妹文档
[archaeology-live-traps]（这些事故留下的现役地雷）· [change-control-hot-zones] · [change-control-deploy-zeabur] · [contract-credit-ledger]
