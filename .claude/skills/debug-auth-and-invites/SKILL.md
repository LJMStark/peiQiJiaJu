---
name: debug-auth-and-invites
description: 排查登录/注册/邮箱验证/莫名被踢下线/密码重置，以及邀请归因丢失、邀请数字不涨、邀请链接失效类问题；better-auth hooks 行为细节与邀请归因时间窗。不用于：admin 权限与 API 鉴权模式（→ contract-api-auth-envelope）、加改用户表字段（→ change-control-schema-migrations）。
---

# Auth 与邀请排错

## 适用 / 不适用
- **适用**：登录/注册/验证邮件/被踢下线/密码重置的行为异常；邀请没归因上、邀请链接失效、邀请数据不对。
- **不适用**：新端点该怎么鉴权（→ [contract-api-auth-envelope]）；给 user 表加字段（→ [change-control-schema-migrations]）；管理后台数据统计问题（属 `app/actions/admin.ts` 常规调试）。

## better-auth 行为细节（都在 `lib/auth.ts`，排查前先知道）

- **2 设备上限**：`session.create.before` hook 数 `"session"` 表行数，达到 `MAX_CONCURRENT_SESSIONS`（=2，`auth.ts:99`）就删最旧会话 → 用户「莫名下线」的第一嫌疑是第三台设备登录把他踢了。注意：**hook 抛错会被吞掉、不阻塞登录**——如果上限貌似没生效，先查这段 hook 是否在静默报错。
- **邮箱验证门只在生产存在**：`requireEmailVerification` 仅生产开启；非生产 `isSessionEmailVerified` 恒真 → **dev 环境复现不了「未验证 403」**，别在本地白排查半天。
- **验证完成钩子**：`afterEmailVerification` 在事务里把邀请归因从 `registered` 升级为 `verified`。用户没点验证邮件，归因就永远停在 `registered`——「邀请数字不涨」先查这里。

## 注册只有一扇门

所有注册必须走 `POST /api/invitations/signup`（全站唯一刻意公开的变更端点）→ 内部调 `auth.api.signUpEmail` + `recordInviteSignup`。**将来加任何新注册入口（如 OAuth）都必须重新接归因**，否则邀请数据静默断流——没有任何报错会提醒你。

## 归因时间窗（最容易搞混的部分）

- 邀请 cookie 存活 `INVITE_ATTRIBUTION_WINDOW_DAYS = 7` 天（点链接 → 注册的窗口）。
- late-claim（先注册、后点链接的补领）窗口 `INVITE_LATE_CLAIM_WINDOW_HOURS = 24`，**从被邀请者的 `createdAt` 起算**。
- 两个窗口不对称是已知设计现状（`lib/invitations.ts:12-13`）。排查「为什么没归因上」先画时间线：点击时间、注册时间、验证时间。
- `/i/[code]` 是 **GET 且会写库**（`claimInviteFromLink`）——爬虫/浏览器预取可能提前消费 late-claim。遇到诡异归因把它列入怀疑名单（在册隐患 → [archaeology-live-traps]）。

## 邀请错误的字符串协定（改文案前必读）

邀请层错误是 `throw new Error('CODE')`、调用侧 `switch (error.message)` 的字符串协定；「邀请表未初始化」甚至靠**子串匹配 PG 报错文本**判断（`lib/invite-center-error-state.ts`）。改任何错误字符串之前，全局搜谁在 switch/match 它，否则错误处理静默失配。

## 密码重置

- 链路曾两修（`3ebe0a9` 引入 → `d333211` 修复）；代理后的 URL 生成看 `lib/site-url.ts`（`a51dca7` 修过代理后重定向）。
- 邮件走 resend（`lib/send-email.ts`）；**没配 `RESEND_API_KEY` 时：非生产把邮件内容打到日志而不是真发（本地「收不到邮件」先看终端输出），生产则在发送时直接抛错**。

## 姊妹文档
[contract-api-auth-envelope]（鉴权拓扑与公开端点白名单）· [change-control-schema-migrations]（user 表加字段的双改姿势）· [archaeology-live-traps]（GET 写库隐患）
