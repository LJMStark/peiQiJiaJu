---
name: debug-generation-failures
description: 排查 /api/generate 与 /api/generate-vibe 的报错和卡顿（含用户反馈「一直转圈/一直生成中/服务繁忙」）：409/429/403/500/503 错误码语义、advisory 锁排障、Gemini 失败、generation_failures 遥测表用法。不用于：生成成功但历史列表或恢复出错（→ debug-history-room-snapshot）、修改额度规则本身（→ contract-credit-ledger）、生产 HTML 错误页（→ change-control-deploy-zeabur）。
---

# 生成链路排错手册

## 适用 / 不适用
- **适用**：生成接口返回错误、长时间无响应、用户反馈「一直在生成中」「服务繁忙」。
- **不适用**：生成成功但历史/缩略图/恢复有问题（→ [debug-history-room-snapshot]）；想改免费额度或 VIP 判定（→ [contract-credit-ledger]）；用户看到的是 HTML 错误页而非 JSON（→ [change-control-deploy-zeabur] 诊断树）。

## 错误码速查（全部实存于代码，2026-07 验证）

| HTTP | code | 含义 | 定义处 |
|---|---|---|---|
| 409 | `GENERATION_ALREADY_RUNNING` | 该用户已有一次生成在跑（每用户一把锁） | `lib/generation-concurrency-core.ts` |
| 429 | `GENERATION_CAPACITY_REACHED` | 全局并发槽位满（默认 2） | 同上 |
| 403 | `FREE_LIMIT_REACHED` | 免费 10 张用完（`FREE_GENERATION_LIMIT`，`lib/generation-access.ts`） | `lib/server/services/generation-execution.ts` |
| 403 | `VIP_EXPIRED` | VIP 已过期 | 同上 |
| 500 | `GENERATION_HISTORY_SCHEMA_MIGRATION_REQUIRED` | 生产库缺 modern 列，跑 `npm run storage:migrate` | `lib/server/generation-history-schema.ts` |
| 503 | （连接性错误） | advisory 锁拿不到数据库连接；响应附 IPv6/pooler 提示文案 | `lib/server/generation-concurrency.ts` |

## 排查步骤

1. **拿 requestId 对日志**：服务端日志 grep `[api/generate]`——start / auth rejected / accepted / success 各阶段都带 requestId 与耗时；锁相关 grep `[generation-concurrency]`。
2. **查遥测表**（注意两点：表可能不存在——42P01 被降级吞掉，先跑 `npm run generation-telemetry:migrate`；失败记录是 best-effort 且与 500 毫秒竞速写入（`generate-route-handler.ts`），**缺记录 ≠ 没失败**）：
   ```sql
   SELECT user_id, route, status_code, error_code, error_message, duration_ms, created_at
   FROM generation_failures ORDER BY created_at DESC LIMIT 20;
   ```
3. **Gemini 侧**：overload/unavailable 会转换成用户可见的「服务繁忙」类提示（`2deee3d`）。Gemini 调用**没有显式超时**——长时间挂起先查出网代理（`instrumentation.ts` ProxyAgent，`05ec2e2`）与网络，再怀疑模型。
4. **持续 409（「已在生成中」不消失）**：advisory lock 随持有连接断开自动释放，进程被杀不会永久锁死。若持续 409：先查 `pg_locks`（现成 SQL 在 [diagnostics-commands]），再确认是否真有长任务在跑。
5. **vibe 路线**（`/api/generate-vibe`）复用同一套锁与额度检查，区别只是输入来自已有历史行（`lib/server/services/vibe-generation-service.ts`）。排查方法完全相同；注意它**也写历史行、也消耗免费额度**。

## 不该在这里改的东西
- 想调并发上限、换连接方式 → [contract-generation-concurrency]（有「池上限 −2」校验和直连铁律，乱动会静默坏）。
- 想动免费额度、VIP 判定 → [contract-credit-ledger]。
- 失败提示文案改动注意保持中文信封风格 → [contract-api-auth-envelope]。

## 姊妹文档
[contract-generation-concurrency] · [contract-credit-ledger] · [debug-history-room-snapshot] · [diagnostics-commands] · [change-control-deploy-zeabur]
