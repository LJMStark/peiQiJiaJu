---
name: debug-history-room-snapshot
description: 排查「Room image not found」、生成历史恢复失败、房间图消失、历史缩略图裂图等历史/快照类 bug；解释房间图-历史快照-引用计数的五条生命周期不变量。不用于：生成请求本身报错（→ debug-generation-failures）、R2 上传下载细节（→ contract-storage-r2）、额度规则（→ contract-credit-ledger）。
---

# 历史 / 快照生命周期排错

## 适用 / 不适用
- **适用**：历史恢复类症状——「Room image not found」、恢复后再生成失败、房间图「消失」、历史缩略图裂、编辑器 bootstrap 空白。
- **不适用**：生成接口 4xx/5xx（→ [debug-generation-failures]）；签名 URL/上传机制本身（→ [contract-storage-r2]）；想删历史行（先读 [contract-credit-ledger]，那是台账）。

## 五条生命周期不变量（动 `lib/server/assets.ts` 前必背）

1. **单房间模型**：服务端每用户只保留最新一张房间图——未被历史引用的旧行在读/写时被顺带清理（`assets.ts` 的 `listRoomImages`/`createRoomImage` 附带清理逻辑）；客户端同样只建单元素数组（`use-room-editor-controller.ts` 的 `handleRoomUpload` 直接 `setRoomImages([payload.item])`）。**这是两端配套的刻意设计，不要把任何一端「修」成多房间**，另一端的假设会塌。
2. **历史不依赖房间行存活**：`createHistoryItem` 在生成时用 `copyStoredImage` 把房间图拷成历史专属的 R2 快照，恢复走快照。房间行删了、历史照样能恢复——这是 `2ee73e8`、`4966d41` 两轮修复确立的核心语义。
3. **物理删除由引用计数守门**：删房间图时只有 `history_reference_count = 0` 才连带删 R2 对象（`assets.ts` 的 `deleteRoomImage` 返回 `storagePathsToDelete`）。
4. **恢复 fallback 链**：`/api/generate` 请求里 `roomImageId` 找不到时，尝试用 `historyItemId` 对应的房间快照兜底（`generation-service.ts` 输入解析 + `roomFallback`）。`62023fb` 修的就是这条链断裂导致的「Room image not found」。
5. **台账约束压顶**：历史行同时是计费台账，只增不删（→ [contract-credit-ledger]）。任何「清理历史」的念头到此打住。

## 症状对号入座

| 症状 | 第一嫌疑 |
|---|---|
| 恢复历史后再生成报「Room image not found」 | 不变量 4 的 fallback 没接上；确认请求带了 `historyItemId`、快照存在 |
| 历史缩略图裂 | 签名 URL 过期，或新图片域名没进 `next.config.ts` remotePatterns（`b72b0f7` 血证 → [contract-storage-r2]） |
| 编辑器进不去 / 空白 | `lib/room-editor-bootstrap.ts`：并发 fetch `/api/rooms` + `/api/history`（`no-store`、`Promise.allSettled`），任一失败也必须能进编辑器（`0cb7bdb` 加固过）。 |
| 「我上传的房间图不见了」 | 大概率不是丢：服务器最新房间只以 `pendingRoomImage` 形式出现，用户要点「继续上次室内图」才进工作区——**刻意交互，不是 bug** |
| 快照恢复内容不全 | `lib/history-room-snapshot.ts` + `4966d41` 的加固范围 |

## 在册大债（别顺手修）

`listHistoryItems`（`assets.ts:533`）无分页全量加载 + 每行 3 次以上签名 URL——头号性能债，曾整体回滚过一次。要动它 = 大工程，先读 [archaeology-costly-failures] 案例②，再按 [change-control-hot-zones] 纪律单独立项。

## 姊妹文档
[debug-generation-failures] · [contract-storage-r2] · [contract-credit-ledger] · [change-control-hot-zones] · [archaeology-costly-failures]
