---
name: contract-storage-r2
description: 上传/下载/拷贝/删除/清理图片资产、改动 lib/server/storage.ts 或 s3-client.ts、新增远端图片域名、处理签名 URL 时的 R2 存储契约细则；AGENTS.md §15 说了必须用 R2，这里是怎么用对。不用于：删除/清理生成历史记录（→ contract-credit-ledger，台账只增不删）、历史快照生命周期（→ debug-history-room-snapshot）、部署配置（→ change-control-deploy-zeabur）、建表迁移（→ change-control-schema-migrations）。
---

# R2 存储契约细则

## 适用 / 不适用
- **适用**：任何触碰 `lib/server/storage.ts`、`lib/server/s3-client.ts`、图片 URL、上传/下载/清理逻辑的改动。
- **不适用**：房间图-历史快照的业务生命周期（→ [debug-history-room-snapshot]）；R2 控制台/桶策略运维；`supabase.storage.*`——出现即打回（AGENTS.md §15，不重复）。

## 布局与限制

- **单桶** `R2_BUCKET_NAME`，三个前缀目录：`furniture-assets` / `room-assets` / `generated-assets`（`lib/storage-config.ts`）。
- 上传上限 `MAX_IMAGE_UPLOAD_SIZE_BYTES = 10MB`（同文件）；服务端用 sharp 做预处理（`lib/server/image-preprocess.ts`）。
- 公开 URL 形态：`${R2_PUBLIC_URL}/<folder>/<path>`，生产域名 `assets.peiqijiaju.xyz`。

## 三条行为规矩（每条有血证）

1. **用户下载必须走 `GET /api/assets/download` 属主代理**（`lib/server/asset-download-route-handler.ts`，内部 `findOwnedAssetDownload` 校验归属）。不要让前端拿签名 URL 直接下载——`8430c3a` 就是为解决跨域/权限问题把下载改进应用的。**展示**用签名 URL 可以，**下载**不行。
2. **新增任何远端图片域名必须同步 `next.config.ts` 的 `images.remotePatterns`**（含更换 R2 公网域名）。否则 `next/image` 全站裂图——`b72b0f7` 血证。
3. **不要绕过 `lib/server/s3-client.ts` 裸建 `new S3Client`**。keep-alive agent + 显式 `@smithy/node-http-handler` 依赖是 `f9cbec2` 为连接稳定性专门加的。该客户端已全环境 memoize；改动后必须手测上传/下载/历史缩略图三连。

## 清理语义

- 资产删除与失败回滚清理是 **best-effort**：失败不阻塞主流程（生成成功比清理干净优先），但必须 log 出 storage path，否则孤儿对象无从追查。
- 跨表引用计数决定物理删除时机（`history_reference_count`，→ [debug-history-room-snapshot] 不变量 3）。
- 删除**历史行**不属于本契约——`generation_history` 是计费台账、只增不删（→ [contract-credit-ledger]）。

## 迁移遗迹警告

历史上存在过 `migrate-storage-to-r2.mjs` 和 Supabase Storage 桶创建段落，均已作废并清理。任何新文档或脚本引用它们都是过时信号，以 `lib/server/storage.ts` 现行实现为准。

## 姊妹文档
[debug-history-room-snapshot]（快照拷贝 `copyStoredImage` 的业务含义）· [archaeology-costly-failures]（案例①：整个存储层为什么重写过一次）· [change-control-deploy-zeabur]（R2 之外的运行时配置）
