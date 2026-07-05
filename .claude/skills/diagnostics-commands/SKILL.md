---
name: diagnostics-commands
description: 需要跑构建/测试/迁移/健康检查、按前缀查日志、或连库做只读诊断时的实测命令与 SQL 速查表；含没有 npm 别名的隐藏脚本与 .env 加载注意事项。不用于：判断该改哪里、为什么坏（→ 对应 debug-*/contract-* 文档）、写迁移（→ change-control-schema-migrations）。
---

# 诊断命令速查（全部经实测，2026-07）

## 适用 / 不适用
- **适用**：需要具体命令、SQL、日志 grep 模式的时刻。
- **不适用**：解释系统行为与改动方案（→ 各 [debug-*] / [contract-*] 文档）；写 DDL（→ [change-control-schema-migrations]，本文档的 SQL 一律**只读**）。

## 构建 / 质量

```bash
npm run dev / build / start / lint / clean
npx tsc --noEmit                                # 类型检查（没有 npm 别名）
node --test tests/*.test.ts tests/*.test.mjs    # 全量 161 个用例，<1 秒，纯单元不连库不连网
node --test tests/generation-concurrency.test.ts  # 跑单个文件
```

注意：**没有 `npm test` 别名**（在册债）；`package.json` 缺 `"type": "module"`，每个 `.ts` 测试文件各打一条 MODULE_TYPELESS 性能警告，无害。

## 迁移（全部幂等、可重复跑；模式 `node --env-file=.env`）

```bash
npm run auth:migrate                    # better-auth 表
npm run invite:migrate                  # invite_links / invite_referrals
npm run generation-telemetry:migrate    # generation_failures
npm run storage:migrate                 # furniture/room/history 表 + modern 列
# storage:migrate:history-schema 与 storage:migrate 指同一文件（历史遗留，不是两个迁移）

# 隐藏脚本（无 npm 别名，AGENTS.md 未记载）：
node --env-file=.env scripts/migrate-vip-system.mjs   # user 表 role/vipExpiresAt 列 + redemption_codes
node --env-file=.env scripts/set-admin.mjs <user-email>  # 授予 admin 角色（缺参会打印中文用法提示）
```

**环境加载规则**：Node 脚本不会自动读 `.env`，必须 `--env-file=.env`（所有迁移脚本的既定写法）；`next dev/build` 自己会读。

## 探活 / 日志

```bash
curl -i https://<host>/api/healthz     # 200 纯文本 'ok'；HEAD 亦可
```

生产日志（Zeabur 控制台）grep 前缀：
- `[api/generate]` —— 生成各阶段（start/accepted/success）带 requestId 与耗时
- `[generation-concurrency]` —— 锁获取/释放异常

看到 HTML 错误页 ⇒ 不是应用输出 ⇒ 走 [change-control-deploy-zeabur] 的诊断树。

## 只读诊断 SQL（`psql "$DIRECT_URL"`；列名均已对照迁移脚本验证）

```sql
-- advisory 锁现状（生成并发）
SELECT * FROM pg_locks WHERE locktype = 'advisory';

-- 某用户免费额度消耗（= 台账行数，语义见 contract-credit-ledger）
SELECT count(*) FROM generation_history WHERE user_id = '…';

-- 最近生成失败（表可能不存在：先跑 generation-telemetry:migrate）
SELECT user_id, route, status_code, error_code, error_message, duration_ms, created_at
FROM generation_failures ORDER BY created_at DESC LIMIT 20;

-- 在线会话数（2 设备上限的观测面）
SELECT count(*) FROM "session";

-- 邀请归因分布
SELECT status, attribution_method, count(*) FROM invite_referrals GROUP BY 1, 2;
```

`DIRECT_URL` 与 `DATABASE_URL` 的语义区别及「为什么锁必须直连」→ [contract-generation-concurrency]。

## 姊妹文档
[change-control-schema-migrations]（要写 DDL 时）· [debug-generation-failures]（错误码含义）· [contract-generation-concurrency] · [acceptance-code-changes]（哪些命令构成验收门）
