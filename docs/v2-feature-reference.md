# Thino (Flomo v2) 功能参考 / 借鉴 Roadmap

> 本文档用于记录闭源插件 **Thino**（即 Flomo v2，作者 Boninall/Quorafind，version 2.7.19）的**功能与交互清单**，作为本仓库（Flomo v1 衍生的 ob-memos）的 roadmap 参考。
>
> ⚠️ **边界说明**：本清单仅来自 v2 的**设置项（`data.json`）、UI class 名（`styles.css`）、界面文案字符串**，即「它有哪些功能、长什么样」，**不包含其实现代码**。借鉴时应基于这些功能/交互思路**独立设计实现**（clean-room），不得反混淆或照抄 v2 代码。

---

## 1. 存储与数据模型（v2 改动最大）

v1 基本只往 daily note 的某个 heading 下追加。v2 支持多种存储后端（`saveThinoType` / `MemoSaveLocation` / `EnabledLocationList`）：

- **Daily / Periodic note**（原有）
- **单文件**：如 `System/basic.thino.md`
- **多文件**：`Thino/` 目录，每条独立，带 `thino/multi` 标签
- **Canvas**：如 `basic.thino.canvas`
- `EnabledLocationList` 可配置多个来源并分别指定插入位置（`target` / `insert`）
- 相关项：`DifferentInsertTarget`、`InsertAfterForTask`、`ProcessContentTarget`、`IgnoreFolderForMultiType`、`SetFileNameAfterCreate`

> 💡 核心借鉴点：从「追加到笔记」升级为「可插拔存储后端」抽象。这是最值得先定方向的架构性改造。

## 2. 视图与浏览

- `MemoListView`: **list / masonry（瀑布流）** 两种布局（`.masonry-memolist`、`.masonry-memolist-grid_column`）
- **Heatmap 热力图**：多配色 grass/flame/ice/magenta/olive/gray…（`HeatmapColorScheme`，`.heatmap-grid`/`.heatmap-cell`）
- **Daily Target / Daily Progress**：每日目标（`MemoDailyTarget`，默认 5）
- **Random Review / Daily Review**：随机/每日回顾（`.memo-review-wrapper`、`.daily-review-wrapper`、`ViewArchiveInRandomReview`）
- **左侧边栏**：标签/过滤导航（`ShowLeftSideBar`、`.left-sidebar`）
- **Filter 系统**：多条件过滤器、按 metadata 过滤、保存的 query（`FilterByMetadata`、`.filter-query-container`、`.create-filter-btn`）
- **折叠超长 memo**：`ThinoCollapsedHeight`（默认 100）、`ThinoMaxHeight`
- 其他：`ShowScrollToTopButton`、`ShowScrollbar`、`hidePinnedGroup`、`navigation`、`showDayMark`/`dayMarkRange`

## 3. 编辑与录入

- 编辑器位置 `DefaultEditorLocation`（Top/Bottom）、**全屏编辑器**（`.fullscreen-editor`）、mini 工具栏（`.cm-mini-toolbar`）
- `UseButtonToShowEditor`、`FocusOnEditor`、`EditorType`（obsidian / 原生）
- **全局快捷键唤起**：`CaptureKey`（`OpenThinoGlobally` 默认 `CommandOrControl+Shift+T`、`ShowNearMouse`）
- 自动加标签：`addTagAutomatically`、`addTagPosition`(End)、`addTagWithNewline`
- 固定前后缀：`MemoFixedPrefix` / `MemoFixedSuffix` / `UseMemoFixedStrings`
- 实时字数统计：`enableWordCount` / `maxWordCount`
- 拖拽：`UseBlockLinkWhenDragging`、`DraggingBehavior`(block-link)、"Drag to paste content"
- 录入组合模板：`DefaultMemoComposition`（`{TIME} {CONTENT}`）、`DefaultPrefix`(List)、`DefaultTimePrefix`(HH:mm)、`InsertDateFormat`(Tasks)

## 4. 行级交互动作

- **评论 / 回复**：`CommentOnMemos`、`CommentsInOriginalNotes`、`ShowCommentOnMemos`（`.memo-comment-*` 一整套）—— flomo 式核心
- Pin / Archive（`.archive-menu-item`）/ Delete（`DeleteThinoDirectly`、`.deleted-memos-container`）
- Copy：thino id / embed link / block link / 选中文本
- 双击行为：`doubleClickBehavior`(edit-thino)
- 图片：`ZoomImageWhenViewing`、`AutoDownloadImage`
- 任务：`HideDoneTasks`、`ShowTaskLabel`、`AppendDateWhenTaskDone`

## 5. 分享 / 导出

- **分享为图片**：自定义背景（明/暗）、自定义页脚（`SetCustomMemoFooter`）
- 页脚模板：`ShareFooterStart`/`ShareFooterEnd`，变量 `{ThinoNum}` `{UsedDay}` `{UserName}`
- 分享主题：`DefaultThemeForThino`(modern)、`MinHeightForShare`、`OptimizeForCallout`
- 导出 CSV、复制过滤结果（`Show Date/Time When Copy Results`）
- **Moments**：朋友圈式分享页（`MomentsBackgroundImage`/`MomentsIcon`/`MomentsQuote`）

## 6. 集成 / 高级（多为 Pro）

- **本地 HTTP API**：`EnabledHttpApi`、`HttpApiIpType`(localhost)、`HttpApiPort`(43999)、Auth Header/Token —— 外部捕获入口
- **同步**：`startSync`、`tokenForVerify`、`SyncManually`、`AppendOrPrependTextViaServer`
- **密码锁**：`password`、`needVerify`
- chat 视图样式 `chatViewStyle`、`.chat-view`
- 来源显示：`ShowSourcePath`、"Show source near timestamp"
- `UseVaultTags`、`enableReferenceLinksGroup`、`NavbarButton`、`AlwaysShowStatusText`

---

## 借鉴优先级（按 价值/成本 排序，独立实现）

| 优先级 | 功能 | 理由 |
|---|---|---|
| 🥇 高价值低成本 | list/masonry 双视图 + 折叠超长 memo | 纯前端渲染，体验提升明显 |
| 🥇 | Heatmap 热力图 + Daily Target | 已有解析逻辑，统计→渲染即可 |
| 🥈 | Filter / 标签侧边栏 | flomo 核心浏览体验 |
| 🥈 | 存储后端抽象（单文件/多文件/daily 可选） | 架构性改造，建议尽早定方向 |
| 🥉 | 评论 / 回复 | 数据格式设计较复杂，但是 flomo 灵魂功能 |
| 🥉 | 分享为图片 | 锦上添花，成本中等 |

---

## v1（本仓库）已有 vs v2 新增 速览

- v1 已有：daily note 追加、基本 list、标签、过滤雏形、时间戳、多行/行内删除归档（feature 分支）
- v2 主要新增：多存储后端、masonry、heatmap、回顾、评论、分享图片、HTTP API、同步、密码锁

> 后续每完成一项借鉴，可在本表打勾并补充本仓库对应实现文件路径。
