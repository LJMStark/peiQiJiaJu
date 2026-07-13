# 页面重构设计方案

> **For agents:** 本文是前端设计重构立项文档，不是立即大改 UI 的许可。动手前必须先读 `.claude/skills/acceptance-ui-changes/SKILL.md`、`.claude/skills/archaeology-live-traps/SKILL.md`，涉及逻辑改动再读 `.claude/skills/acceptance-code-changes/SKILL.md`。

**目标：** 把现有界面整理成一个安静、耐用、适合家具商家每天反复使用的图片工作台。重点不是换一层好看的皮，而是让上传家具、选择室内图、生成效果、找历史结果、管理会员这些动作更顺手、更容易扫读、更少出错。

**设计立场：** 佩奇家具不是营销落地页，也不是展示型作品集。它应该像一套给门店和销售人员使用的工作软件：画面克制，信息密度适中，主操作明确，图片始终是第一视觉对象。保留现有 `zinc` 灰阶、`indigo` 强调色、黑色主按钮、`emerald` 成功色、`amber` 会员/提示色，不另起一套配色和字体。

**当前技术：** Next.js 15 App Router、React 19、Tailwind CSS v4、lucide-react、motion/react、next/image、Inter + JetBrains Mono。

---

## 一个新来的前端设计师会先看到什么

我先不评价页面“好不好看”，只观察用户每天要做什么、哪里容易停下来、什么已经做对。

- 主产品已经有清楚的核心动作：上传家具、上传或继续室内图、一次生成效果图、查看历史。
- 当前 UI 大多能用，但样式散在具体组件里，`globals.css` 只有 Tailwind import，还没有项目级 design tokens 或通用 UI primitive。
- `Dashboard.tsx` 同时管导航、公司名编辑、图册请求、删除回滚、欢迎弹窗和三个主 tab，后续视觉改动很容易牵到业务状态。
- `RoomEditor` 已经拆成输入区、结果区、历史区、抽屉和弹窗，是最适合先做设计重构的主工作区。
- admin 页面已经偏工作台风格，适合保持高密度，不应该套用面向客户的图片化大版面。
- 前一轮已经清掉一批 UI 旧债：英文兜底、假进度条、`gray-*`、`green-*`、手写弹窗可访问性、`rounded-[28px]`。新方案不能把这些问题带回来。

上一轮设计检查还留下三个有价值的结论：移动端按钮必须能稳定点中；错误信息不能把数据库或厂商术语甩给用户；室内编辑器的空白结果区必须告诉用户还缺哪一步。这三条不是历史备注，而是这次重构的起点。

### 对产品的第一判断

- **主要用户不是来浏览内容的人**，而是门店销售、家具商家和运营人员。他们会重复上传、选择、生成、下载，不需要每次都重新理解页面。
- **产品价值集中在一次完整生成**。首页、图册、会员和邀请都应服务于这个动作，不能和它争夺视觉中心。
- **信任来自状态准确**。图片是否上传成功、家具是否选中、生成是否仍在进行、结果是否会过期，都要在发生的位置说明。
- **当前最大矛盾不是颜色不统一**，而是业务状态和视觉结构混在大组件中，页面一改就容易碰到请求、回滚和历史恢复。

### 本次重构要改善的四个结果

1. 新用户进入工作台后，5 秒内知道从哪里开始。
2. 熟练用户能在尽量少的滚动和视线移动中完成一次生成。
3. 网络慢、数据为空或操作失败时，页面仍能告诉用户现在发生了什么、下一步做什么。
4. 后续新增功能时，可以复用现有按钮、面板、提示和弹窗，不再各写一套。

## 页面范围

### 客户工作台

- `/` -> `DashboardShell` -> `Dashboard`
- `components/Catalog.tsx`
- `components/RoomEditor.tsx`
- `components/room-editor/*`
- `components/VipCenter.tsx`
- `components/InviteCenter.tsx`
- `components/ContactQrCode.tsx`
- `components/WelcomeGuideModal.tsx`

### 登录与账号入口

- `components/Login.tsx`
- `components/auth/AuthShell.tsx`
- `components/auth/SignInForm.tsx`
- `components/auth/SignUpForm.tsx`
- `app/(auth)/*`
- `app/signin/page.tsx`
- `app/signup/page.tsx`
- `app/verify-email/page.tsx`

### 管理后台

- `app/admin/layout.tsx`
- `app/admin/AdminNavLinks.tsx`
- `app/admin/page.tsx`
- `app/admin/codes/page.tsx`
- `app/admin/invitations/page.tsx`
- `components/admin/*`

## 已经存在、应该保留的东西

- `Inter` 和 `JetBrains Mono` 已在 `app/layout.tsx` 接好，不增加第三套字体。
- `zinc`、`indigo`、黑色主按钮、`emerald`、`amber`、`red` 已形成稳定语义，不重新发明颜色含义。
- `useDialogAccessibility` 已解决 Escape、背景关闭和焦点移入，新弹窗继续复用。
- `RoomEditor` 已拆出输入、结果、历史和家具抽屉，本次在现有边界上调整，不重新写控制器。
- `tests/ui-debt-source.test.ts`、键盘测试和房间编辑器状态测试已经守住一批真实回归。
- admin 已有数据卡片、图表和表格的工作台形态，继续保持高密度。

仓库目前没有 `DESIGN.md`。第一阶段应把上述事实整理成最小设计规范，作为后续页面改动的共同依据，而不是另起一个品牌设计项目。

## 不在本次范围内

- 不改业务规则、权限规则、数据库结构或 API 返回形状。
- 不把产品首页改成营销页；登录后第一屏仍然是实际工作台。
- 不引入第三方 UI 套件，除非先完成单独评估。
- 不新增字体族、不新增深色模式、不新增另一套主题色。
- 不为了视觉重构顺手改邀请、生成、存储、会员等服务端代码。
- 不一次性重写所有组件。每个阶段都要能单独提交、单独回滚。
- 不重做品牌标志、宣传文案和公共营销站。
- 不增加深色模式、渐变主按钮、装饰插画或大面积动效。
- 不调整生成模型、积分价格、会员权益和邀请规则。
- 不把桌面端布局原样缩小后称为移动端方案。

## 设计原则

- **主视觉对象是图片**：房间图、家具图和生成结果要比装饰图形更重要。
- **工作流优先**：用户要能快速知道现在缺什么、下一步点哪里、失败后怎么继续。
- **少用解释性大段文字**：界面文案要短，按钮和状态自己说明用途。
- **不要卡片套卡片**：页面区域用布局承载，卡片只用于列表项、数据块、弹窗和确实需要框住的工具。
- **状态必须完整**：空态、加载态、错误态、禁用态都要有设计，不只画正常状态。
- **移动端不做缩水版桌面**：320 / 768 / 1440 三档都要检查，移动端主操作不能被横向滚动或浮层挡住。
- **图片操作要稳定**：上传、预览、下载、历史恢复、生成中这些动作不能因为 hover 文案、按钮出现或图片比例变化导致布局跳动。

## 用户完成一次工作的过程

| 阶段 | 用户在做什么 | 用户最可能担心什么 | 页面要给出的回应 |
|---|---|---|---|
| 进入 | 打开工作台 | 从哪里开始、上次内容还在不在 | 当前页签明确；新用户看到一个主入口，老用户看到最近内容 |
| 准备 | 上传房间图、选择家具 | 图片传错、家具没选上 | 就地预览、选中数量、替换入口和就绪清单 |
| 生成 | 提交生成 | 是否卡住、是否需要一直等 | 只显示真实阶段或不确定等待态，保留当前输入上下文 |
| 查看 | 比较生成结果 | 哪张是当前结果、如何放大 | 主图优先，上一张/下一张、放大和当前序号位置固定 |
| 保存 | 下载或反馈 | 图片会不会丢、操作是否成功 | 下载入口靠近结果；明确 30 天期限；成功提示不遮图 |
| 返回 | 查历史、恢复房间 | 恢复后会不会覆盖当前工作 | 缩略图、日期、家具数可扫读；覆盖前明确确认 |
| 受限 | 遇到次数或会员限制 | 为什么不能继续 | 说明限制原因，并给出兑换或联系管理员的下一步 |

这个过程要同时照顾三个时间尺度：第一次进入时不迷路；连续使用 5 分钟时不被弹窗和说明打断；长期使用时，常用动作的位置始终稳定。

## 页面信息层级

### 工作台整体

```text
工作台
├── 顶栏：公司名 / 当前账号 / 管理后台入口 / 退出
├── 主导航：家具图册 / 室内编辑器 / 会员中心
└── 当前任务区
    ├── 页面主操作
    ├── 当前内容或结果
    └── 次要说明、历史和辅助入口
```

用户首先看到当前任务和主操作，其次看到状态与结果，最后才看到说明、帮助和低频管理入口。公司名编辑、客服二维码、欢迎弹窗不能抢过生成流程。

### 室内编辑器

```text
桌面 1440
┌────────────输入准备────────────┬────────────────生成结果────────────────┐
│ 1. 室内图                      │ 主图 / 生成等待态 / 就绪清单             │
│ 2. 已选家具                    │ 下载、反馈、再生成、氛围增强              │
│ 3. 补充要求                    │                                          │
│ 4. 生成按钮                    │                                          │
└───────────────────────────────┴──────────────────────────────────────────┘
┌──────────────────────────────最近历史，按需加载更多────────────────────────┐
└───────────────────────────────────────────────────────────────────────────┘

移动端 320
室内图 → 家具 → 补充要求 → 生成按钮 → 当前结果 → 最近历史
```

桌面端让结果占最大面积；移动端按任务顺序排列，不把结果藏进横向滑动，也不使用悬浮按钮遮挡主图。生成完成后可把视线引到结果区，但不能强制滚动到让用户失去上下文的位置。

### 其他页面的前三层内容

| 页面 | 第一眼 | 第二眼 | 第三眼 |
|---|---|---|---|
| 家具图册 | 上传入口或已有家具 | 家具名称、分类和上传状态 | 删除、批量反馈和说明 |
| 会员中心 | 当前会员状态与到期信息 | 兑换入口 | 邀请收益与使用说明 |
| 邀请中心 | 当前可复制链接 | 邀请转化状态 | 最近记录与重置入口 |
| 登录注册 | 当前表单和主按钮 | 页面目的和账号切换 | 产品说明 |
| admin 首页 | 异常与核心指标 | 趋势和排行 | 明细表格 |
| admin 兑换码 | 生成动作与本次结果 | 历史记录 | 规则说明 |

## 视觉与交互规范

- **视觉方向**：克制的工具感。白色和 `zinc` 承载页面，颜色只标识选择、状态和风险。
- **布局**：采用稳定网格；内容最大宽度沿用 `max-w-7xl`。工作区之间用留白和细边框区分，避免卡片套卡片。
- **间距**：以 4px 为最小单位，常用间距限定在 4 / 8 / 12 / 16 / 24 / 32 / 48px。页面区块主要使用 24 或 32px，控件内部使用 8 或 12px。
- **圆角**：按钮使用 `rounded-lg` 或 `rounded-full`，面板使用 `rounded-xl` 或 `rounded-2xl`，不增加任意圆角。
- **阴影**：默认依赖边框和层级；只有弹窗、浮层、正在操作的结果可以使用明显阴影。
- **字体**：正文与界面继续使用 Inter；编号、邀请码、技术明细和等宽数据使用 JetBrains Mono。
- **动效**：只保留帮助理解状态的 150–250ms 过渡。上传、切换、弹窗和成功提示可以动；背景装饰、循环漂浮和大面积入场动画不加入。
- **图片**：使用稳定宽高比和明确最小高度；按钮不覆盖图片主体；加载前后不能改变页面主要结构。

### 刻意不做的通用模板样式

- 不做一排相同图标的三列功能卡片。
- 不使用紫色渐变、玻璃拟态和每块区域都悬浮的圆角卡片。
- 不在登录后的首页放巨幅宣传标题。
- 不为“高级感”降低正文对比度或隐藏按钮。
- 不用动效掩盖真实等待，也不用假百分比制造确定感。

产品自己的辨识度来自两点：真实家具图片始终占据主视觉；页面像商家每天会打开的工作台，而不是通用 AI 生图网站。

## 交互状态覆盖

| 功能 | 加载中 | 空状态 | 错误 | 成功 | 部分可用 |
|---|---|---|---|---|---|
| 工作台启动 | 保留页面骨架和稳定顶栏 | 新账号直接指向上传家具或室内图 | 页面级中文提示，可重试或重新登录 | 显示当前页签和已有内容 | 某个页签失败时，其他页签仍可进入 |
| 家具图册 | 上传区显示真实上传/识别阶段 | 说明家具将用于生成，主按钮为“上传家具图片” | 错误靠近上传区并提供重试 | 新家具进入网格并给出短暂确认 | 部分图片失败时列出失败项，不抹掉成功项 |
| 房间输入 | 上传区保持尺寸，显示正在上传 | 明确要求上传一张室内图 | 说明失败原因并保留已有家具选择 | 就地显示房间预览和替换入口 | 家具已选但房间缺失时，就绪清单只指出缺项 |
| 生成结果 | 只显示真实阶段或不确定态 | 就绪清单说明还缺房间、家具或要求 | 错误显示在生成动作附近，可展开技术详情 | 主图、下载、反馈、再生成可用 | 多张结果部分失败时保留成功图片并说明数量 |
| 生成历史 | 首屏使用稳定缩略图骨架 | 说明结果会在生成后出现，不放无意义空卡片 | 历史区局部报错并提供重试 | 显示缩略图、日期、家具数和恢复动作 | 加载更多失败不移除已加载历史 |
| 会员兑换 | 提交按钮锁定并显示处理中 | 未开通时说明可获得什么和如何取得兑换码 | 在输入框附近说明错误，不清空卡密 | 会员状态和到期时间即时更新 | 邀请区失败不影响查看会员状态 |
| 邀请中心 | 保留标题和内容骨架 | 没有链接时突出生成动作；没有记录时说明如何开始 | 对用户隐藏数据库细节，给出重试或联系管理员 | 复制、生成、重置都有明确确认 | 统计失败时仍保留可复制链接 |
| admin 数据 | 每个数据块单独加载 | 表格说明为何暂无数据 | 单块失败单块提示，其他指标继续显示 | 数据更新时间可辨认 | 迁移未完成时说明管理员可执行的命令 |

所有状态文案都要回答两个问题：现在发生了什么；用户接下来能做什么。

## 响应式与无障碍

| 宽度 | 布局要求 | 导航和操作 |
|---|---|---|
| 320px | 单列任务顺序；图片不小于可判断内容的高度；不出现横向页面滚动 | 顶栏只保留必要入口；页签允许有意图的横向滚动；主按钮满宽或易触达 |
| 768px | 根据内容采用一列或两列；输入和结果不强行挤成桌面比例 | 页签完整显示；次要动作可进入工具栏，不藏进 hover |
| 1440px | 室内编辑器采用 1:2 输入/结果比例；历史独立成区；admin 保持数据密度 | 常用动作常驻；低频动作靠近所属内容，不另设全局工具条 |

- 所有可点击目标至少 44×44px；桌面端视觉尺寸可更小，但命中区域不能缩小。
- 键盘能按视觉顺序到达所有输入、页签、图片动作和弹窗按钮；焦点样式不能只靠颜色变化。
- 纯图标按钮提供中文 `aria-label`；状态变化使用合适的提示区域，不反复抢焦点。
- 弹窗复用 `useDialogAccessibility`，支持 Escape、点背景关闭、打开时移入焦点、关闭后回到触发按钮。
- 正文和按钮满足 WCAG AA 对比度；不能用颜色单独区分成功、警示或失败。
- 图片有具体中文替代文本；纯装饰图标从读屏内容中隐藏。
- 尊重“减少动态效果”设置，非必要过渡可以关闭。

## 已确定的设计选择

| 选择 | 结论 | 原因 |
|---|---|---|
| 产品首页形态 | 登录后直接进入工作台 | 用户来完成工作，不是看宣传内容 |
| 首要重构页面 | 室内编辑器 | 它承载产品最重要的一次完整操作 |
| 桌面布局 | 结果区大于输入区 | 用户最终判断和保存的是图片结果 |
| 移动布局 | 按准备到结果的纵向顺序 | 单手操作比保留桌面三栏更重要 |
| 视觉变化幅度 | 保留配色字体，重做层级与组件 | 降低业务回归风险，也延续用户记忆 |
| admin 风格 | 高密度工作台 | 管理员需要扫读和定位异常，不需要展示感 |
| 空状态 | 说明上下文并给一个主动作 | 空白页面必须帮助用户开始，而不是只报告“暂无数据” |

## 编码前要核对的事实

- 移动端生成完成后不强制滚动。页面先播报完成状态并提供“查看结果”入口；真机检查若发现用户经常错过结果，再单独评估温和的视线引导。
- 当前家具图册没有可靠的搜索和分类入口，本次只整理上传、网格、预览、删除和反馈，不虚构筛选能力。
- 先确认 admin 每个数据块是否有独立失败边界；缺失时把局部失败处理列入任务 6，不用占位数据伪装成功。
- 邀请中心继续作为会员中心内部分区，保留现有 URL 兼容规则，不因视觉调整改变入口含义。

## 目标结构

### 1. 共用界面基础

先补项目自己的轻量 UI 基础，不急着做大组件库：

- `components/ui/Button.tsx`：主按钮、次按钮、危险按钮、图标按钮，统一 `type`、尺寸、禁用和 loading。
- `components/ui/Panel.tsx`：页面区域和工具面板，限制圆角、边框、阴影。
- `components/ui/EmptyState.tsx`：空态标题、说明、主动作。
- `components/ui/StatusNotice.tsx`：成功、警示、错误、信息提示。
- `components/ui/DialogFrame.tsx`：复用 `useDialogAccessibility`，统一弹窗标题、关闭按钮、底部动作区。
- `components/ui/Toolbar.tsx`：结果区、图册、admin 表格上方的操作栏。

这些组件只包视觉和基础交互，不包业务请求。

### 2. 工作台外壳

`Dashboard.tsx` 需要从「什么都管」拆成更清楚的结构：

- `components/dashboard/DashboardHeader.tsx`
- `components/dashboard/DashboardTabs.tsx`
- `components/dashboard/CompanyNameEditor.tsx`
- `components/dashboard/DashboardContent.tsx`
- `components/dashboard/useCatalogData.ts`

目标是让视觉重构集中在 header、tabs、content 容器里，图册请求和删除回滚不混在大 JSX 中。

### 3. 室内编辑器

这是第一优先级，因为它是产品价值最高的页面。

目标布局：

- 左侧或上方是「输入准备」：当前室内图、已选家具、补充要求、生成按钮。
- 中间是「生成结果」：图片占主要面积，下载、反馈、再生成、增强氛围这些动作靠近结果。
- 下方或侧边是「历史结果」：默认显示最近结果，更多历史用分页加载。
- 家具抽屉只负责挑家具，不把生成设置塞进去。

重点修正：

- 生成前的就绪检查要更像清单，少像说明书。
- 生成中只展示真实阶段或不确定态，不出现假百分比。
- 结果区按钮不要挤压图片；图片容器要有稳定比例和最小高度。
- 历史结果要能扫读：缩略图、日期、家具数量、动作按钮位置固定。
- 手动拖拽摆放是高级动作，不能抢生成主流程的视觉权重。

### 4. 图册、会员和邀请

这些页面不是主画布，但会影响商家日常使用。

- `Catalog`：强化批量上传后的反馈；家具卡片的预览和删除动作放在固定位置。当前没有可靠的搜索、分类入口，本次不凭空增加。
- `VipCenter`：会员状态、兑换码、邀请收益分区更清楚，避免像三个独立功能硬拼在一起。
- `InviteCenter`：突出可复制链接、已邀请列表和异常状态；不要暴露内部判断细节。
- `ContactQrCode`：保持轻量浮动入口，不扩大成干扰主工作区的客服模块。

### 5. 管理后台

admin 是运营工具，目标是扫读和定位异常，不追求展示感。

- 数据看板保留卡片 + 图表 + 表格的高密度布局。
- 表格操作区统一按钮尺寸和状态提示。
- 错误降级要让管理员知道哪一块加载失败，但不要让整页崩掉。
- 不把 customer workspace 的图片风格强行搬到 admin。

## 实施计划

### 任务 1：页面清单、截图与最小设计规范

**文件：**
- Create: `DESIGN.md`
- Create: `docs/plans/2026-07-07-frontend-design-inventory.md`
- Optional artifacts: `docs/plans/artifacts/frontend-design/*`

**步骤：**
1. 列出所有用户可见页面和主要组件。
2. 在 320 / 768 / 1440 三档截图：登录、图册、室内编辑器、会员中心、admin 首页、兑换码页、邀请页。
3. 记录每页的主要动作、空态、加载态、错误态。
4. 把现有颜色、字体、间距、圆角、动效和无障碍要求写入 `DESIGN.md`，不创建新品牌风格。
5. 用现有 UI 规范标出反例，不改代码。

**验证：**
- 文档包含页面清单、截图路径、每页主动作和已知风险；`DESIGN.md` 与 `acceptance-ui-changes` 的现行规则一致。
- `git diff --check` 通过。

**提交：**
```bash
git add DESIGN.md docs/plans/2026-07-07-frontend-design-inventory.md docs/plans/artifacts/frontend-design
git commit -m "docs: add frontend design inventory"
```

### 任务 2：补齐共用界面组件

**文件：**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Panel.tsx`
- Create: `components/ui/EmptyState.tsx`
- Create: `components/ui/StatusNotice.tsx`
- Create: `components/ui/DialogFrame.tsx`
- Create: `components/ui/Toolbar.tsx`
- Test: `tests/ui-primitives-source.test.ts`

**步骤：**
1. 先写源码测试，防止 `gray-*`、`green-*`、任意圆角、无 `aria-label` 图标按钮回流。
2. 建轻量组件，只承载样式、语义和基础状态。
3. 暂不迁移业务组件，先让 primitives 自己通过类型和 lint。

**验证：**
```bash
node --test tests/ui-primitives-source.test.ts
npx tsc --noEmit
npm run lint
```

**提交：**
```bash
git add components/ui tests/ui-primitives-source.test.ts
git commit -m "feat: add shared ui primitives"
```

### 任务 3：拆分工作台外壳，不改变行为

**文件：**
- Modify: `components/Dashboard.tsx`
- Create: `components/dashboard/DashboardHeader.tsx`
- Create: `components/dashboard/DashboardTabs.tsx`
- Create: `components/dashboard/CompanyNameEditor.tsx`
- Create: `components/dashboard/DashboardContent.tsx`
- Create: `components/dashboard/useCatalogData.ts`
- Create: `tests/dashboard-navigation.test.ts`
- Test: existing catalog, company name, client boundary, auth keyboard tests

**步骤：**
1. 把 header、tabs、公司名编辑、tab 内容拆出文件。
2. 保持 URL 参数、欢迎弹窗、图册请求、删除回滚行为不变。
3. 用 shared UI primitives 替换重复按钮和提示。

**验证：**
```bash
node --test tests/dashboard-navigation.test.ts tests/catalog-state.test.ts tests/company-name.test.ts tests/client-boundaries.test.ts tests/auth-keyboard-accessibility.test.ts
npx tsc --noEmit
npm run lint
```

**提交：**
```bash
git add components/Dashboard.tsx components/dashboard tests
git commit -m "refactor: split dashboard shell components"
```

### 任务 4：重构室内编辑器操作顺序

**文件：**
- Modify: `components/RoomEditor.tsx`
- Modify: `components/room-editor/RoomEditorInputPanel.tsx`
- Modify: `components/room-editor/RoomEditorResultPanel.tsx`
- Modify: `components/room-editor/RoomEditorHistorySection.tsx`
- Modify: `components/room-editor/FurnitureDrawer.tsx`
- Test: room editor state, history, source guard tests

**步骤：**
1. 先锁住当前行为测试：上传室内图、选择家具、生成、分页加载历史、恢复历史房间。
2. 调整布局，让结果图片成为最大区域，准备清单和生成按钮靠近用户下一步动作。
3. 统一加载、错误、空态和下载按钮。
4. 检查拖拽摆放在移动端不可用时的提示，不让它干扰主流程。

**验证：**
```bash
node --test tests/room-editor*.test.ts tests/history-pagination.test.ts tests/ui-debt-source.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

**人工检查：**
- 320 / 768 / 1440 三档无横向溢出。
- 键盘可以打开和关闭所有弹窗。
- 生成中、生成失败、无历史、无家具、会员限制都能看到明确下一步。

**提交：**
```bash
git add components/RoomEditor.tsx components/room-editor tests
git commit -m "style: redesign room editor workflow"
```

### 任务 5：整理其他客户页面

**文件：**
- Modify: `components/Catalog.tsx`
- Modify: `components/VipCenter.tsx`
- Modify: `components/InviteCenter.tsx`
- Modify: `components/ContactQrCode.tsx`
- Modify: `components/WelcomeGuideModal.tsx`
- Test: UI source guards and invite tests where relevant

**步骤：**
1. 用共用界面组件替换重复按钮、提示和弹窗框架。
2. 图册只整理现有上传、网格、预览和删除行为；没有数据支持时不增加搜索和分类。
3. 保持文案短句，给出明确下一步。
4. 确保会员、邀请、客服入口不抢室内编辑器主流程。

**验证：**
```bash
node --test tests/ui-debt-source.test.ts tests/invitation-service.test.ts
npx tsc --noEmit
npm run lint
```

**提交：**
```bash
git add components/Catalog.tsx components/VipCenter.tsx components/InviteCenter.tsx components/ContactQrCode.tsx components/WelcomeGuideModal.tsx tests
git commit -m "style: clean customer workspace surfaces"
```

### 任务 6：整理管理后台

**文件：**
- Modify: `app/admin/layout.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/codes/page.tsx`
- Modify: `app/admin/invitations/page.tsx`
- Modify: `components/admin/*`
- Test: admin navigation and UI source guards

**步骤：**
1. 统一管理后台顶栏、页面分区、指标卡和表格操作的尺寸与颜色。
2. 把遗留的非规范角色色收回 `zinc` / `indigo` 语义，不增加 admin 专属配色。
3. 保持高密度，不改成大图展示。
4. 每个数据块失败时保留局部提示，不影响其它块阅读。

**验证：**
```bash
node --test tests/admin*.test.ts tests/ui-debt-source.test.ts
npx tsc --noEmit
npm run lint
```

**提交：**
```bash
git add app/admin components/admin tests
git commit -m "style: clean admin workspace surfaces"
```

### 任务 7：最终视觉验收

**文件：**
- Modify: `docs/plans/2026-07-07-frontend-design-inventory.md`
- Optional artifacts: refreshed screenshots

**步骤：**
1. 更新截图和页面状态记录。
2. 跑完整验证。
3. 写清楚仍保留的问题，不在同一提交里继续扩大范围。

**验证：**
```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
git diff --check
```

**提交：**
```bash
git add docs/plans/2026-07-07-frontend-design-inventory.md docs/plans/artifacts/frontend-design
git commit -m "docs: record frontend design acceptance"
```

## 验收标准

- 登录后第一屏仍然是可用工作台，不是宣传页。
- 室内编辑器在 320 / 768 / 1440 三档都能完成主流程。
- 主按钮、图标按钮、弹窗、空态、提示条不再各写各的样式。
- 新增 UI 不出现 `gray-*`、`green-*`、`rounded-[...]`、英文兜底文案。
- 所有新弹窗复用 `useDialogAccessibility` 或达到同等行为。
- 生成中不出现假百分比。
- 图片容器有稳定尺寸，结果按钮不遮挡主图。
- 管理后台保持工作台密度，不照搬客户工作台的图片展示方式。
- 所有页面都按状态表检查加载、空、错误、成功和部分可用状态。
- 所有触控目标不小于 44×44px，键盘焦点顺序与视觉顺序一致。
- 用户可见文案都说明当前状态和下一步，不暴露数据库、存储厂商或内部错误码。
- `npx tsc --noEmit`、`npm run lint`、`npm test`、`npm run build` 通过。

## 停止扩大范围的条件

发现以下情况时停止扩大重构范围，先单独立项：

- 需要改 API 返回字段或数据库结构。
- 需要换 Tailwind 配置、字体、主题色或引入 UI 套件。
- 发现移动端主流程必须改交互模型，而不是只调布局。
- 发现生成、历史、邀请、会员等业务行为和现有测试不一致。
- 任何截图检查发现主流程不可完成。

## 相关文档

- `.claude/skills/acceptance-ui-changes/SKILL.md`
- `.claude/skills/acceptance-code-changes/SKILL.md`
- `.claude/skills/archaeology-live-traps/SKILL.md`
- `.claude/skills/change-control-hot-zones/SKILL.md`
- `docs/plans/2026-03-21-backend-architecture-recovery.md`

## 参考依据

- [IKEA Kreativ：从房间照片开始选择和替换家具](https://www.ikea.com/ch/en/customer-service/knowledge/articles/1a780f75-e136-4945-9863-50687a959cd4.html)
- [Homestyler：上传房间、选择条件、生成结果的分步过程](https://www.homestyler.com/ai-room-design?lang=en_US)
- [Adobe Firefly：生成工作与历史资产分区管理](https://helpx.adobe.com/firefly/web/access-your-files/view-generation-history.html)
- [Apple：未知时长使用不确定进度提示](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
- [WCAG 2.2：目标尺寸、焦点和拖拽替代操作](https://www.w3.org/TR/WCAG22/)
