# 项目技能文档索引

15 份技能文档，六大板块，全部基于 2026-07 全仓审计的实证结论写成。**公共前提**：AGENTS.md 是根规则，技能文档不复述它，只承载 AGENTS.md 之外的「为什么」与「怎么用对」。

## 路由表（按任务找文档）

| 你要做的事 | 读这份 |
|---|---|
| 改邀请 / auth / 历史 / 并发 / 存储等热区 | change-control-hot-zones |
| 建表、加列、写迁移脚本、改 better-auth 字段 | change-control-schema-migrations |
| 部署、启动脚本、超时、生产 HTML 错误页/样式全丢 | change-control-deploy-zeabur |
| 生成接口报错、用户说「一直转圈/服务繁忙」（409/429/403/500/503） | debug-generation-failures |
| Room image not found / 历史恢复 / 快照 bug | debug-history-room-snapshot |
| 登录、被踢、验证邮件、邀请归因问题 | debug-auth-and-invites |
| 技术选型、大重构立项前 | archaeology-costly-failures |
| 动某文件前查雷、接清理任务 | archaeology-live-traps |
| 历史列表分页、历史加载慢、优化 assets.ts | archaeology-live-traps |
| 触碰 generation_history、额度、删历史类需求 | contract-credit-ledger |
| 兑换码没生效、VIP 到期/生效判定问题 | contract-credit-ledger |
| 上传下载、签名 URL、图片域名、storage.ts | contract-storage-r2 |
| 并发上限、advisory 锁、连接池、扩容评估 | contract-generation-concurrency |
| 新增/修改 API 路由、鉴权、错误返回 | contract-api-auth-envelope |
| 要命令、要 SQL、要日志 grep 模式 | diagnostics-commands |
| 代码写完准备说 done | acceptance-code-changes |
| UI 改动准备说 done | acceptance-ui-changes |

## 板块地图

- **变更管控**：change-control-hot-zones · change-control-schema-migrations · change-control-deploy-zeabur
- **调试手册**：debug-generation-failures · debug-history-room-snapshot · debug-auth-and-invites
- **失败考古**：archaeology-costly-failures（事故为什么发生）· archaeology-live-traps（雷现在埋在哪）
- **架构契约**：contract-credit-ledger · contract-storage-r2 · contract-generation-concurrency · contract-api-auth-envelope
- **诊断工具**：diagnostics-commands
- **验收标准**：acceptance-code-changes · acceptance-ui-changes

## 维护规则

1. 新事故复盘 → 先更新 archaeology-costly-failures（含再犯检测器），拆出的现役坑登记进 archaeology-live-traps。
2. 拆掉一颗雷 → 从 archaeology-live-traps 划掉，别留幽灵条目。
3. 行号会漂移：文档引用以**函数名/常量名/提交哈希**为锚，行号仅作辅助；发现失锚顺手修正。
4. 每份文档保持「适用 / 不适用 + 姊妹指路」结构；新增技能先查本索引避免职责重叠。
