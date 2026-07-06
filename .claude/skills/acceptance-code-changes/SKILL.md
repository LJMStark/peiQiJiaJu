---
name: acceptance-code-changes
description: 任何代码改动在宣称完成或提交之前的验收门：三件套全绿基线、按改动域的附加测试与手测清单、新逻辑的测试风格要求、「弱化测试」判定标准。不用于：UI 视觉与文案验收（→ acceptance-ui-changes）、命令怎么跑（→ diagnostics-commands）。
---

# 代码变更验收门

## 适用 / 不适用
- **适用**：写完任何代码、准备说「done」或提交之前。
- **不适用**：界面视觉/文案/a11y 的验收（→ [acceptance-ui-changes]，UI 改动两份都要过）；具体命令语法（→ [diagnostics-commands]）。

## 基线（三件套全绿才算完成；2026-07 基线：tsc 0 错误 / lint 0 告警 / 170 pass）

```bash
npx tsc --noEmit
npm run lint
npm test
```

GitHub Actions 会在 push / PR 跑同一组三件套；本地提交前仍要跑，不能只等 CI。

## 按域附加验收

| 你动了 | 必跑测试（`node --test …`） | 必做手测 |
|---|---|---|
| `lib/auth*`、`components/auth/*` | `tests/auth-*.test.ts` `tests/site-url.test.ts` | 第三设备登录 → 最旧会话被踢；注意 dev 复现不了邮箱验证门（→ [debug-auth-and-invites]） |
| 生成 / 并发 / 额度 | `tests/generation-*.test.ts` `tests/generate-*.test.ts` `tests/vibe-generation-service.test.ts` | 同账号双开生成 → 409；免费号第 11 张 → 403 `FREE_LIMIT_REACHED` |
| `assets.ts` / 历史 / 快照 | `tests/history-*.test.ts` `tests/room-image-*.test.ts` `tests/room-editor-bootstrap.test.ts` | 删房间图 → 从历史恢复 → 再生成，全程无「Room image not found」 |
| 邀请 | `tests/invitation*.test.ts` `tests/invite-*.test.ts` | 新账号走邀请链接注册 + 验证邮箱 → 归因升级 `verified` |
| 存储 / R2 | `tests/asset-download*.test.ts` `tests/remote-images.test.ts` | 上传、下载、历史缩略图三连 |
| 启动 / 部署脚本 | `tests/start-next-assets.test.mjs` | `npm run build && npm run start` 本地完整起一次 |

## 新逻辑的测试要求

- 风格：`node:test` + `assert`，纯单元，依赖走 DI 注入（参照 `createGenerateRouteHandler(deps)` 系列可测缝的既有做法）。
- **禁止**测试连 DB、连网、碰文件系统——全套 <2 秒是这套测试还活着、真的会被跑的根本原因，谁破坏谁负责恢复。
- 覆盖失败路径：这个库的测试文化是错误分支也断言（信封 code、降级行为），新代码看齐。

## 「弱化测试」判定标准（AGENTS.md §7 说了禁止，这里定义什么算）

以下任一即弱化，禁止：断言从具体值改成 truthy/存在性；用 try-catch 包住断言吞失败；删除或 skip 失败用例；mock 掉被测对象本身。改断言的唯一正当理由：**需求变了**，且提交信息里写明变在哪。

## 提交前最后一眼

- conventional commit + 单事项（热区改动加读 [change-control-hot-zones]）。
- `git status` 确认没夹带 `.env`、`.local-admin-access.md`（已 gitignore，永远别 `git add -f`）。

## 姊妹文档
[acceptance-ui-changes]（UI 面）· [diagnostics-commands]（命令语法）· [change-control-hot-zones]（提交纪律）
