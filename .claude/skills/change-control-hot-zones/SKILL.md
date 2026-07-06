---
name: change-control-hot-zones
description: 改动邀请系统、auth/注册、生成历史与 assets.ts、生成并发、R2 存储这五个高事故率热区之前必读的变更纪律（单事项提交、禁止捆绑、回滚协议）。不用于：纯文案或样式改动（→ acceptance-ui-changes）、数据库结构变更（→ change-control-schema-migrations）、部署与运行时配置（→ change-control-deploy-zeabur）。
---

# 热区变更纪律

## 适用 / 不适用
- **适用**：你的 diff 触碰下表任一路径，或者你打算在这些区域做重构。
- **不适用**：纯 UI 视觉与文案（→ [acceptance-ui-changes]）；建表加列（→ [change-control-schema-migrations]）；部署、超时、启动脚本（→ [change-control-deploy-zeabur]）。

## 五大热区（按历史事故密度排序，fix 数来自 git 考古）

| 热区 | 核心文件 | 历史代价 | 出事先看 |
|---|---|---|---|
| 邀请系统 | `lib/server/invitation-service.ts`、`invitation-store.ts`、`app/i/[code]/route.ts`、`app/api/invitations/*` | 约 7 个 fix + 4 次搬家重构（`2b92a7e` 之后的整条链） | [debug-auth-and-invites] |
| auth / 注册 / 重置密码 | `lib/auth.ts`、`components/auth/*`、`app/(auth)/*` | ≥5 个 fix（含键盘可达性回归 `0fa36c5`） | [debug-auth-and-invites] |
| 生成历史 / 资产 | `lib/server/assets.ts`、`lib/history-room-snapshot.ts` | ≥5 个 fix（「Room image not found」家族）；唯一一次整提交回滚发生地 | [debug-history-room-snapshot] |
| 生成并发 | `lib/generation-concurrency-core.ts`、`lib/server/generation-concurrency.ts` | ≥3 个 fix（锁走错连接会静默失效） | [contract-generation-concurrency] |
| R2 存储 | `lib/server/storage.ts`、`lib/server/s3-client.ts`、`next.config.ts` remotePatterns | ≥3 个 fix（图裂、连接不稳、下载路由） | [contract-storage-r2] |

## 纪律（每条都有血证）

1. **单事项提交**。血证：`81b8ad3` 把 Vercel 式 `maxDuration` 平台配置和 604 行历史分页数据层重写捆进一个提交，2.5 小时后被 `8577add` 整体回滚，分页需求就此蒸发三个多月。平台配置、数据层重写、UI 改动，三类永不同提交。
2. **热区内禁止 drive-by 清理**。看到死代码想顺手删：先查 [archaeology-live-traps] 是否在册，另开独立清理提交。热区 diff 越纯净，回滚越便宜。
3. **改前跑该域测试子集，改后跑全量**。域与测试文件的对应表在 [acceptance-code-changes]。全量基线：174 个用例。
4. **回滚协议**：热区改动出问题，优先整提交 `git revert`（先例 `8577add`），不打补丁续命。回滚后必须在 `docs/plans/` 留尸检记录——分页那次没留，导致后来者不知道它死过、为什么死、还欠什么。
5. **`assets.ts` 是热区中的热区**：705 行装着家具/房间图/历史三个仓库，backend recovery 计划（`docs/plans/2026-03-21-backend-architecture-recovery.md`）里唯一没人敢完成拆分的就是它（Task 2 烂尾）。动它之前必须先读 [contract-credit-ledger]（台账不变量）和 [debug-history-room-snapshot]（生命周期五不变量）。

## 姊妹文档
- 事故完整档案与再犯检测 → [archaeology-costly-failures]
- 当前在册地雷清单 → [archaeology-live-traps]
- 完成前的验收门 → [acceptance-code-changes]
