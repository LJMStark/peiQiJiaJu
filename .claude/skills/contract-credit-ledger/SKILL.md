---
name: contract-credit-ledger
description: 触碰 generation_history 表、免费额度/生成次数、VIP 门槛判定、兑换码兑换后 VIP/额度不生效的排查入口、或任何「删除/清理/归档历史」类需求时必读的计费台账铁律：credit 等于历史行数、只增不删、服务端唯一执法。不用于：生成接口报错排查（→ debug-generation-failures）、历史恢复 bug（→ debug-history-room-snapshot）、兑换码增删改与发码的实现细节（membership-service 常规开发）。
---

# 额度台账契约

## 适用 / 不适用
- **适用**：任何涉及 `generation_history` 行数、免费额度、生成上限、「让用户删历史」「自动清理旧数据」的需求或改动。
- **不适用**：生成失败排查（→ [debug-generation-failures]）；快照/恢复语义（→ [debug-history-room-snapshot]）；兑换码本身的增删改（`lib/server/services/membership-service.ts` + `redemption_codes`，不动台账）。

## 铁律

1. **系统没有独立的 credit 字段**。免费额度消耗 = `SELECT COUNT(*) FROM generation_history WHERE user_id = …`（`lib/server/repositories/history-repository.ts` 的 `countUserGenerationHistory`）。
2. **因此 `generation_history` 只增不删**。全库现无任何 `DELETE FROM generation_history`（2026-07 验证）。任何「删历史 / 清理旧行 / 归档」都等于**给免费用户退还额度** = 计费事故。若产品必须做删除，先引入独立计数（如 user 表累计列或独立 ledger 表）并迁移存量，再谈删除——那是一个立项，不是一个改动。
3. **「氛围增强」也计费**：`/api/generate-vibe` 同样插入历史行 ⇒ 同样消耗免费额度。改免费策略、写用户文案时记得它，免费用户可能在不知情下双倍消耗。
4. **执法唯一点在服务端**：`getGenerationAccessState`（`lib/generation-access.ts`）——admin 与有效 VIP 无限；VIP 过期 → 403 `VIP_EXPIRED`；免费满 `FREE_GENERATION_LIMIT = 10` → 403 `FREE_LIMIT_REACHED`。上限数字改这里一处即可。
5. **客户端传 `generationCount: 0` 是刻意的**（`use-room-editor-controller.ts:350` 与 `:444` 两处）：让客户端预检永不拦截、一切由服务端裁决。**不要**「补上」客户端执法，也不要把客户端传来的计数当真。
6. **台账无客户端写路径**：`/api/history` 只有 GET——`e5eb31b` 专门关闭了曾经存在的 POST（那是个持续一周的计费安全口子，见 [archaeology-costly-failures] 荣誉提名）。新端点不得给客户端任何直写 `generation_history` 的能力；历史写入只能发生在 generation service 内部。

## 相邻但不属于本契约

- **VIP 开通**：`redeemMembershipCode`（membership-service）改的是 `"user"."vipExpiresAt"`，不动台账。
- **`/api/usage`**：只读展示额度状态。注意它直接内嵌 SQL 绕过了服务层，是在册分层违规——**别模仿**它的写法。

## 姊妹文档
[debug-generation-failures]（403 错误码语义）· [archaeology-costly-failures]（台账直写 near-miss）· [change-control-schema-migrations]（若要引入独立计数列）
