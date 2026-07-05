---
name: change-control-schema-migrations
description: 需要加表、加列、改 better-auth 用户字段、或编写/运行 scripts/migrate-*.mjs 迁移脚本时使用；含 generation_history 双列兼容窗口与 42703/42P01 降级约定。不用于：日常 SQL 查询编写、只读诊断查询（→ diagnostics-commands）、R2 对象操作（→ contract-storage-r2）。
---

# Schema 迁移剧本

## 适用 / 不适用
- **适用**：任何 DDL（建表、加列、加索引）、better-auth 用户字段扩展、新迁移脚本的编写与接线。
- **不适用**：只读诊断 SQL（→ [diagnostics-commands]）；改查询逻辑不改结构（普通开发流程）；存储对象操作（→ [contract-storage-r2]）。

## 铁律

1. **DDL 只允许存在于 `scripts/migrate-*.mjs`**。请求路径中的运行时 DDL 已被 `caf62e3`（recovery Task 7）全部清除，不要以任何形式加回去（包括「首次访问时自动建表」这种便利）。
2. **幂等**：`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`，整脚本 `BEGIN`/`COMMIT` 包裹。最佳模板是 `scripts/migrate-generation-telemetry.mjs`：显式 `CREATE EXTENSION IF NOT EXISTS pgcrypto`（`gen_random_uuid()` 在老 PG 上属于 pgcrypto）、单事务、可重复跑。
3. **每个新迁移脚本必须挂 npm script**（`node --env-file=.env scripts/xxx.mjs` 模式）。反面现状：`migrate-vip-system.mjs` 和 `set-admin.mjs` 没有 npm 别名、AGENTS.md 也没记载，新人根本不知道它们存在。
4. 迁移脚本自己负责读 `.env`（`--env-file`），不要假设环境变量已注入。

## generation_history 的双列兼容窗口（本库最特殊的约定）

- 该表同时携带 **legacy 单家具列**（`furniture_item_id`、`furniture_*_snapshot`）和 **modern 多家具列**（`selected_furniture_item_ids text[]`、`selected_furnitures_snapshot jsonb`，由 `ALTER TABLE … ADD COLUMN IF NOT EXISTS` 补上）。
- 查询构造集中在 `lib/server/generation-history-schema.ts`；**写路径固定用 `'modern'` 变体**（`'legacy'` 构造器存在但从未被选择——在册死代码，见 [archaeology-live-traps]）。
- **列缺失（PG 错误码 42703）不是 bug，是约定信号**：会被映射成 500 + `GENERATION_HISTORY_SCHEMA_MIGRATION_REQUIRED`，提示运维跑 `npm run storage:migrate`。
- **表缺失（42P01）同理**：`generation_failures` 允许整表不存在，读写方全部降级（`lib/server/generation-failure-log.ts`、`app/actions/admin.ts`）。
- 推论：**删 legacy 列 = 单方面关闭兼容窗口**，必须先确认生产已跑过迁移、且代码读路径不再引用 legacy 列，作为独立提交处理。

## better-auth 表的特殊性

- `"user"` / `"session"` / `"account"` / `"verification"` 是 better-auth 领地，表名小写、SQL 里必须带双引号。
- 加自定义列的正确姿势是**双改**：迁移脚本 `ALTER TABLE`（先例：`migrate-vip-system.mjs` 加 `role`、`"vipExpiresAt"`）+ `lib/auth.ts` 的 `additionalFields` 同步声明。只改一边会得到「迁移成功但代码读不到字段」的幽灵状态。
- better-auth 自身结构变更走 `npm run auth:migrate`（`scripts/migrate-better-auth.mjs`），不要手写它的核心表。

## 现有资产清单（2026-07 验证）

- **脚本 8 个**：`migrate-better-auth.mjs`、`migrate-storage-assets.mjs`（注意：内部仍残留 Supabase 桶创建段落，已作废）、`migrate-vip-system.mjs`、`migrate-invite-system.mjs`、`migrate-generation-telemetry.mjs`、`set-admin.mjs`、`start-next.mjs`、`start-next-assets.mjs`（后两个是启动脚本不是迁移）。
- **npm 别名坑**：`storage:migrate` 与 `storage:migrate:history-schema` 指向同一个文件，历史遗留，不代表两个不同迁移。
- **表 11 张**：`"user"`、`"session"`、`"account"`、`"verification"`、`furniture_items`、`room_images`、`generation_history`、`redemption_codes`、`invite_links`、`invite_referrals`、`generation_failures`（后两批可能未迁移，见降级约定）。

## 姊妹文档
- 迁移命令与只读诊断 SQL → [diagnostics-commands]
- 台账表（generation_history）的业务不变量 → [contract-credit-ledger]
- 事故背景（为什么曾有运行时 DDL）→ [archaeology-costly-failures]
