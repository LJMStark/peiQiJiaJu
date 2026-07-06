---
name: acceptance-ui-changes
description: 改动任何用户可见界面（组件、页面、文案、弹窗、动效）时的验收标准：现行事实设计规范（zinc 灰阶 + indigo 强调 + 黑 CTA）、弹窗 a11y 最低线、中文文案强制、债区不扩散名单。不用于：逻辑与接口验收（→ acceptance-code-changes，UI 改动两份都要过）、产品方向决策。
---

# UI 验收标准

## 适用 / 不适用
- **适用**：任何 `.tsx` 界面改动、用户可见文案、弹窗、加载/空/错误态。逻辑验收另见 [acceptance-code-changes]（两份都要过）。
- **不适用**：纯服务端改动；设计方向的重新决策（那是立项，不是验收）。

## 事实设计规范（全库未 token 化——`globals.css` 只有一行 import——以下清单就是现行规范，别再各自发明）

- **灰阶**：zinc。新代码包括 admin 一律 zinc，禁止回到 gray。
- **强调色**：indigo（链接、选中、进行中）；**主 CTA**：`bg-zinc-900` 黑底白字；**成功**：emerald，禁止新增 green；**警示/VIP**：amber；**危险**：red。
- **圆角**：卡片 `rounded-xl`/`rounded-2xl`，按钮 `rounded-lg`/`rounded-full`。不引入新档位、不用任意值；已由 `tests/ui-debt-source.test.ts` 防止旧反例回流。
- **字体**：next/font/google 的 Inter（`--font-sans`）+ JetBrains Mono（`--font-mono`），已在 `app/layout.tsx` 接线；不新增第三个字体族；**无深色模式**——`dark:` 前缀出现即打回（除非专门立项）。
- **文案**：一律简体中文，**包括错误兜底与空状态**。禁止向用户暴露厂商名/内部术语；已由 `tests/ui-debt-source.test.ts` 防止旧英文兜底和旧存储名回流。

## 组件最低线

- **弹窗**：新弹窗必须同时满足——Escape 可关、点背景可关、`role="dialog"` + `aria-modal="true"`、打开时焦点移入。现有手写弹窗已接入 `useDialogAccessibility`，新增弹窗必须复用同一套处理或达到同等行为。
- **按钮**：显式 `type`（非提交场景 `type="button"`）；纯图标按钮必须 `aria-label`；触控目标 ≥44px（移动端头部改造 `38936c1` 的先例）。
- **加载态**：超过 ~300ms 的等待必须有反馈；**禁止写死百分比的假进度**。等待未知时长用不确定态动画或真实阶段文案。
- **图片**：`next/image` + 显式尺寸；新远端域名同步 remotePatterns（→ [contract-storage-r2]）。

## 提交前逐项清单

- [ ] 320 / 768 / 1440 三档宽度无横向溢出，主操作可完成
- [ ] 键盘走一遍：Tab 可达、Enter/Space 可触发、焦点可见（键盘可达性有过真实回归 `0fa36c5`，守护测试 `tests/auth-keyboard-accessibility.test.ts` 在册）
- [ ] 空态 / 加载态 / 错误态三态齐备（不是只有 happy path；标杆参照结果面板的「就绪清单」空态）
- [ ] 文案中文、给出下一步动作（风格对齐信封 error 文案 → [contract-api-auth-envelope]）
- [ ] `npx tsc --noEmit` + `npm run lint` 通过（样式改动也要跑）

## 姊妹文档
[acceptance-code-changes]（逻辑面验收，UI 改动两份都过）· [archaeology-live-traps]（当前地雷索引）· [contract-storage-r2]（图片域名）
