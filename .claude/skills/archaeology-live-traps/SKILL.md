---
name: archaeology-live-traps
description: 当前代码里仍然活着的地雷、技术债与死代码索引，改到相关文件前查一眼，避免踩雷或误「顺手修」；接到清理/优化/删死代码类任务先对照本清单立项。不用于：了解事故来龙去脉（→ archaeology-costly-failures）、日常变更纪律（→ change-control-hot-zones）。
---

# 现役地雷索引（2026-07 审计基线，已按 2026-07-06 清理更新）

## 适用 / 不适用
- **适用**：动手改某文件前查它是否带雷；接到「清理/优化」类任务时对照本清单立项。
- **不适用**：想知道雷是怎么埋下的（→ [archaeology-costly-failures]）；改动流程与提交纪律（→ [change-control-hot-zones]）。

**使用原则**：除非任务本身就是拆雷，否则**只绕行、不顺手修**（热区纪律）。拆雷 = 独立提交。

## 按危险度排列

1. **【配置迷宫】三套 DB 连接串策略并存**：`lib/db.ts`（`DATABASE_URL ?? DIRECT_URL`）、`lib/auth.ts`（`preferDirect` 开关）、`lib/server/generation-concurrency.ts`（优先 `DIRECT_URL`，**有铁律原因**，见 [contract-generation-concurrency]）。新代码别发明第四套；将来统一时不得破坏并发锁的直连要求。
2. **【工具链】**：`eslint-config-next@16` vs `next@15` 版本错位仍保留，因为 `eslint-config-next@15.4.9` 在当前 ESLint 9 + flat config 下会让 `npm run lint` 启动失败；已补 `package.json` 的 `"type": "module"`、`npm test` 别名和 GitHub Actions CI。
3. **【UI 债】**（完整名单以本条为准，不扩散规则见 [acceptance-ui-changes]）：假进度条（`RoomEditorResultPanel.tsx` 写死 75%）、admin 整页 gray 灰阶、8 个弹窗无 a11y、全局 `error.tsx` / `not-found.tsx` 英文文案、`Dashboard.tsx` 两处英文兜底、`Catalog.tsx` 泄漏「Supabase Storage」字样、成功色 green/emerald 混用（emerald 为准）、`rounded-[28px]` 任意值圆角反例。

## 姊妹文档
[archaeology-costly-failures]（雷的来历）· [change-control-hot-zones]（拆雷纪律）· [contract-generation-concurrency] · [acceptance-ui-changes]
