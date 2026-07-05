---
name: contract-generation-concurrency
description: 调整生成并发上限、修改 advisory 锁逻辑、改数据库连接策略或连接池大小、评估多实例扩容时必读的并发契约：PG 会话级锁、直连铁律、池上限减二校验。不用于：409/429 报错的日常排查（先 → debug-generation-failures）、一般 SQL 或迁移（→ change-control-schema-migrations）。
---

# 生成并发契约

## 适用 / 不适用
- **适用**：改 `lib/generation-concurrency-core.ts`、`lib/server/generation-concurrency.ts`、`GENERATION_GLOBAL_CONCURRENCY_LIMIT`、`DATABASE_POOL_MAX`、DB 连接串策略，或评估横向扩容。
- **不适用**：用户报 409/429 的排查（→ [debug-generation-failures] 有速查表）；普通查询连接（`lib/db.ts` 常规用法）。

## 锁模型（`lib/generation-concurrency-core.ts`，2026-07 验证）

两级 advisory lock，都是两参形式 `pg_try_advisory_lock($1, $2)`：

1. **每用户一把**：key 由 `sha256(userId)` 摘要导出 → 同一用户并发第二次生成得 409 `GENERATION_ALREADY_RUNNING`。
2. **全局槽位**：命名空间 `GLOBAL_GENERATION_LOCK_NAMESPACE = 32025`（`:26`），槽位 `1..limit` 依次尝试 → 全满得 429 `GENERATION_CAPACITY_REACHED`。
3. limit 来自环境变量 `GENERATION_GLOBAL_CONCURRENCY_LIMIT`（默认 2），**启动校验强制它低于 `DATABASE_POOL_MAX` 且保留至少 2 条余量**（`validateGenerationConcurrencyLimit`，`:73` 有显式 throw）——因为每把锁在生成期间占用一条真实连接，把 limit 调到贴近池上限会饿死其他查询。

## 直连铁律（本契约的核心，违反即静默坏）

- advisory lock 是**会话级**：锁绑定在持有它的那条 PG 连接上。事务模式的连接池（pgbouncer transaction mode）会在语句间换连接 ⇒ 锁静默失效或看似永不释放。
- 因此并发模块**自建连接池并优先 `DIRECT_URL`**（`lib/server/generation-concurrency.ts` 的解析逻辑）。`1c9fb07` 就是把锁从共享池切到直连的修复；`a58968c` 让连接失败显式冒 503 而不是被吞。
- 503 响应附带的运维提示（实存文案）：Supabase 直连 5432 可能需要 IPv6 出网；无 IPv6 时用 session pooler 的 5432 端口（session 模式锁语义仍成立，transaction 模式不行）。
- **禁止**：把锁改回事务池连接；把锁替换成内存 Map/信号量——运行时今天是单进程长驻（→ [change-control-deploy-zeabur]），但并发正确性不押注在「永远单实例」上。

## 释放语义

进程崩溃或连接断开 ⇒ PG 自动释放 advisory lock，**不会永久卡死**。持续 409 的排查顺序：`pg_locks` 现状（现成 SQL 在 [diagnostics-commands]）→ 是否真有长任务在跑 → 连接是否被代理层挂住。

## 改动验收

动此区域必跑 `node --test tests/generation-concurrency.test.ts tests/generation-execution.test.ts`，并手测：同一账号双开生成 → 第二个必须得 409；配置 limit=1 时两个不同账号并发 → 后者 429。

## 姊妹文档
[debug-generation-failures]（错误码速查与日志前缀）· [diagnostics-commands]（pg_locks 查询）· [change-control-deploy-zeabur]（单进程运行时模型）· [archaeology-live-traps]（四套连接串策略迷宫）
