# TODO 清单

> 源自 `docs/code-review-issues.md` 审查 + 2026-05-20/21 实际使用反馈与代码审查
> ✅ = 已修复 🔴 = 待修复 Bug 🟢 = 新功能 🎨 = UI/UX

---

## ✅ 已修复 (2026-05-21)

| 优先级 | 问题                                                     | 根因                                                     | 改动                                                                                 |
| ------ | -------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 🔴     | **R1. ProjectDetailView 未传 description**               | workbuddy 回滚丢失代码                                   | 新增 `downloadDescription` ref，`startDownload()` 查找版本描述，模板传 `:description` |
| 🔴     | **R2. 设置页缺少角色选择器**                             | F4 设置页功能未闭环                                      | 操作者卡片增加角色选择 radio；`handleSave` 改用 `saveUserProfile` 同步保存角色       |
| 🔶     | **R3. UploadDialog 未传 projectName 给 IPC 和 task 参数** | IPC 调用和 task 参数均遗漏 `projectName`                 | `startUpload` 和 task params 补充 `projectName`                                      |
| 🎨     | **R4. 首页 hero 区域版本号硬编码**                       | 直接写死 `v1.0.0`，未关联 `package.json` 的 version     | 改为 `v{{ api.version }}`，通过 `__APP_VERSION__` 构建时注入动态读取                 |

## ✅ 已修复 (2026-05-20)

| 优先级 | 问题                                     | 根因                                                                        | 改动                                                                               |
| ------ | ---------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------- | ------------------ |
| P0     | 取消操作误显示已完成                     | return 后 catch 无法区分 cancelled                                          | `fs/index.ts` return → throw; 渲染层 catch 按 cancelled 路径处理                   |
| P0     | `retryTask()` 无进度监听                 | 重试时未注册 progress 回调                                                  | `taskStore.ts` 重试时注册回调                                                      |
| P0     | DownloadDialog params 类型不匹配         | `overwrite: boolean` 与实际参数签名不一致                                   | `overwrite: boolean` → `mode`                                                      |
| P1     | `cancelRequested` 全局竞态               | 单布尔变量跨请求共享                                                        | 引入 `CancelScope` 对象模式                                                        |
| P1     | 版本号解析可能产生 `NaN`                 | `parseInt` 对非数字字符串返回 `NaN`                                         | `isNaN` 防御                                                                       |
| P1     | 取消下载无清理                           | 缺少取消后的清理路径                                                        | 合并至 P0 修复                                                                     |
| **高** | **B1. 忽略规则不支持文件夹模式**         | 目录路径带尾 `/`，正则和 `split('/').pop()` 均无法正确匹配                  | `ignore.ts` 增加去尾 `/` 后再匹配                                                  |
| **中** | **B2. 配置导入导出包含操作者信息**       | 导出完整 state，导入自动合并 settings                                       | 导出仅含 `projects`；`importState` 跳过 `settings`；UI 不赋值                      |
| **高** | **B3. 重试"对象不可克隆"**               | Pinia reactive proxy 无法被 Electron 结构化克隆                             | `taskStore.ts` 传入 IPC 前 `toRaw` + `JSON.parse(JSON.stringify)` 脱敏             |
| **中** | **B4. `.asar` 文件 BUSY 占用**           | Electron C++ asar 拦截器 `stat`/`readdir` 时打开并缓存 .asar 文件           | 主进程全面迁移至 `original-fs/promises`，移除 `process.noAsar` / `withNoAsar` 模式 |
| 🔴     | **B5. 版本删除路径穿越 + 符号链接攻击**  | `fs.rm({ recursive: true })` 跟随符号链接；`remoteDirectory` 无路径越界校验 | 新增 `safeDelete` 不跟随符号链接；`resolve` 校验路径范围；`lstat` 拒绝顶层符号链接 |
| **高** | **B6. Tailwind v4 CSS 构建警告**         | `var(--spacing)*11` 在任意值中被误解析为 `var(--spacing*11)` 无效语法       | 改为字面量 `calc(100vh-44px)` 避免经过 Tailwind 间距系统解析                       |
| P2     | P2-1. `utils/errors.ts` 死代码           | 渲染层无文件引用该模块                                                      | 删除 `src/renderer/src/utils/errors.ts`                                            |
| P2     | P2-2. 主进程 `AppError` 接口未使用       | 只定义了接口，无任何消费方                                                  | 从 `src/main/errors.ts` 中移除无用接口                                             |
| P2     | P2-3. `VersionInfo` 类型重复定义         | main/version 和 renderer/types 各维护一份，易不同步                         | 抽取到 `src/shared/types.ts`，两端统一导入                                         |
| P2     | P2-4. `ProjectDraft` 类型双重维护        | 手写字段列表，与 `ProjectConfig` 松耦合                                     | 改为 `Omit<ProjectConfig, 'id'                                                     | 'createdAt' | 'updatedAt'>` 派生 |
| P3     | P3-1. `copyFileNoAsar` 代码重复          | 未复用已有的 `withNoAsar` 包装                                              | `copyFileNoAsar` 内部改为调用 `withNoAsar`                                         |
| P3     | P3-2. `scanFiles`/`scanRemoteFiles` 重复 | 递归 walk 逻辑完全一致，仅 `.version.json` 过滤不同                         | 提取 `walkDirectory` 公共函数，接收可选 `filterEntry`                              |
| P3     | P3-3. `el-radio` 废弃 `value` 属性       | Element Plus 2.9+ 推荐使用 `label` 替代                                     | UploadDialog + DownloadDialog 中 `value` → `label`                                 |
| P3     | P3-4. 远程目录为空时路径指到当前目录     | 无前端验证，依赖后端报错                                                    | `handleSave` 中增加 `name` + `remoteDirectory` 前端校验                            |
| P3     | P3-5. `electron.vite.config.ts` 多余配置 | preload `build` 块为默认值；VueDevTools 应在生产移除                        | 移除 `build` 块；VueDevTools 条件注入                                              |
| P3     | P3-6. `onMounted` 未 await 异步函数      | 回调未标记 async，Promise 悬空                                              | 改为 `async` 并 `await loadOperatorName()`                                         |
| P3     | P3-7. 主进程函数参数过多                 | `uploadVersion` 6 参数 / `downloadVersion` 5 参数                           | 改为 options 对象模式                                                              |
| P3     | P3-8. 扫描失败仍可点击"开始上传"         | `:disabled` 未检查 `scanError`                                              | 增加 `                                                                             |             | !!scanError` 条件  |
| P3     | P3-9. 下载对话框缺少文件预览             | 下载前无法查看远程文件清单                                                  | 新增 IPC `download:scan-remote-files`，DownloadDialog 增加文件预览区               |
| 🎨     | U3-1. 上传/下载图标不旋转                | Element Plus is-loading 动画在暗色主题下可能未生效                          | 改用自定义 `is-spinning` CSS 动画 + `@keyframes spin-icon`                         |
| 🎨     | U3-2. 进度条高度太小                     | `stroke-width="10"` 文字被裁剪                                              | 增大至 `stroke-width="20"`                                                         |
| 🎨     | U3-3. 无意义 TAG                         | 纯装饰性 `el-tag` 无数据                                                    | 移除 UploadDialog "版本号自动递进" + ProjectDetailView "项目详情"                  |
| 🎨     | **U1. 上传弹窗布局优化**                 | 单列垂直排列，信息密度低                                                    | 加宽弹窗 680→860px，文件预览改为 el-tree；修复树构建逻辑；压缩各级留白             |
| 🎨     | **U2. 删除项目列表上传按钮**             | 首页卡片上传按钮冗余                                                        | 移除 HomeView 项目卡片的上传按钮和相关图标导入                                     |
| 🟢     | **F1. 已忽略文件列表展示**               | 无法确认上传规则是否正确                                                    | walkDirectory 收集被忽略路径，UploadDialog 底部添加可展开忽略文件列表              |
| 🟢     | **F2. 草稿保存**                         | 关闭弹窗丢失已填内容                                                        | UploadDialog + ProjectConfigDialog 使用 localStorage 自动保存/恢复草稿             |
| 🟢     | **F5. 系统托盘 + 远程目录监控**          | 无后台守护和远程变化感知                                                    | WatcherService + 系统托盘 + 系统通知 + 渲染层联动                                  |
| 🔴     | **F5-bug-1: 托盘图标显示为空**           | SVG data URL 不支持                                                         | 改为纯 Node.js 生成 PNG 文件加载                                                   |
| 🔴     | **F5-bug-2: 启动时通知所有已存在版本**   | 首次轮询 snapshot 为空 → 全触发 added                                       | 增加 `initialized` 标志跳过首次                                                    |
| 🟢     | **F5-ext: 应用图标**                     | 窗口/任务栏/Alt+Tab 无图标                                                  | 生成 256×256 app-icon.png，配置 BrowserWindow.icon + electron-builder win.icon     |
| 🎨     | **U3. 上传选项补充说明**                 | "新增"/"修复"缺少版本号影响提示                                             | 增加 subtitle 说明文字                                                             |

---

## 🔴 Bug — 已验证

（暂无待修复 Bug）

## 🟢 新功能需求

### F1. 已忽略文件列表展示 — ✅ 已修复

**改动：** `walkDirectory` 增加 `ignoredFiles` 参数收集被忽略的路径；`scanFiles` 返回 `{ files, ignoredFiles }` 对象；UploadDialog 文件预览区域底部添加可展开的"已忽略 N 个文件/目录"区域，箭头图标切换展开/收起。

**文件：** `UploadDialog.vue`、`src/main/fs/index.ts`、`src/renderer/src/types/app.ts`、`src/renderer/src/env.d.ts`

---

### F2. 草稿保存 — ✅ 已修复

**改动：** UploadDialog 和 ProjectConfigDialog 使用 `localStorage` 自动保存和恢复草稿。

- 新建项目对话框实时保存表单草稿到 `draft:project:new`，保存成功后清除
- 上传弹窗实时保存 `changeType`/`hasBreakingChange`/`description` 到 `draft:upload:{projectName}`，上传成功后清除
- 编辑已有项目不触发草稿（已有数据不会丢失）

**文件：** `UploadDialog.vue`、`ProjectConfigDialog.vue`

---

### F3. 记录项目当前下载版本，显示新版本 TAG — ✅ 已修复

**改动：**

- `ProjectConfig` 新增 `currentDownloadedVersion?: string` 可选字段（两端类型同步）
- `DownloadDialog` 完成下载时 `emit('done', versionName)` 传递版本名
- `ProjectDetailView.handleDownloadDone` 调用 `api.saveProject()` 持久化当前下载版本
- 版本列表中当前下载版本显示 "当前版本" 标签
- 首页项目卡片显示当前版本号标签 + 异步扫描远程版本，若存在更新版本则显示 "新版本" 提示标签

**文件：** `src/renderer/src/types/app.ts`、`src/main/config/store.ts`、`DownloadDialog.vue`、`ProjectDetailView.vue`、`HomeView.vue`

---

### F4. 权限设计：研发 / 测试角色 — ✅ 已实现

- 操作者角色分为 `developer`（研发）和 `tester`（测试）
- 研发：全部功能可用
- 测试：只能下载，不能上传（按钮禁用 + UploadDialog 内二次拦截）
- 首次启动弹窗增加角色选择（两栏卡片式 radio）
- 设置页可修改角色
- 全局 Header 显示当前角色标签
- 配置导出不包含角色设置（与 operatorName 同理，本地偏好不应共享）
- 角色仅为 UI 层面拦截，不涉及后端鉴权

**文件：** `src/renderer/src/types/app.ts`、`src/main/config/store.ts`、`src/main/ipc/config.ts`、`src/preload/index.ts`、`src/renderer/src/env.d.ts`、`App.vue`、`SettingsView.vue`、`ProjectDetailView.vue`、`UploadDialog.vue`

---

### F5. 系统托盘 + 远程目录监控 + 应用图标 — ✅ 已实现

**改动：**

- `WatcherService` 单例（`src/main/watch/directory-watcher.ts`）：30s 轮询 + `fs.watch` 监控远程目录版本变化
- 路径去重：相同远程目录共享一个 `WatcherEntry`，多个项目可关联
- 首次轮询仅建立 snapshot 基线，不触发事件（`initialized` 标志）
- 系统托盘（`src/main/tray/index.ts`）：关闭窗口 → 隐藏到托盘，单实例锁，右键菜单"显示窗口/退出"
- 系统通知：检测到远程变化时使用 `Notification` API（系统级通知）+ `webContents.send()`（渲染层 `ElNotification`）
- 项目 CRUD 同步：`saveProject`/`deleteProject` IPC handler 自动更新 watcher
- 应用图标：`scripts/generate-icon.cjs` 参数化生成哆啦A梦 PNG（32×32 + 256×256）
- 跨环境图标加载：生产 `process.resourcesPath` / dev `__dirname` / 源码路径三级兜底

**Bug 修复：**

- 托盘图标为空：SVG data URL 不支持系统托盘 → 改为纯 Node.js `zlib` 生成 PNG
- 启动通知所有版本：增加 `initialized` 标志跳过首次轮询

**文件：** `src/main/watch/directory-watcher.ts`、`src/main/tray/index.ts`、`src/main/tray/tray-icon.png`、`src/main/tray/app-icon.png`、`scripts/generate-icon.cjs`、`src/main/index.ts`、`src/main/ipc/config.ts`、`src/preload/index.ts`、`src/renderer/src/env.d.ts`、`src/renderer/src/types/watch.ts`、`src/renderer/src/App.vue`、`package.json`

---

## 🎨 UI/UX 改进

### U1. 上传弹窗布局优化 — ✅ 已修复

**改动：** 回到单列布局（取消两栏），弹窗扩宽至 860px；文件预览改为 el-tree 树形结构。

- 弹窗宽度 680px → 860px
- 版本号 + 变动类型 + 版本说明均恢复单列垂直排列，留足间距
- 文件预览改用 `<el-tree>` 树形组件，目录可折叠/展开
- 文件夹以 cyan 色图标 + 合计大小显示，文件以 slate 色图标 + 单独大小显示
- 树节点 hover 背景适配暗色主题
- 修正 `buildFileTree` 中目录/文件匹配逻辑（`!isLast` → `isLast`）
- 压缩弹窗内留白：body padding 24px→16px, 卡片 p-5→p-4, 间距 space-y-4→space-y-3, 按钮 py-3→py-2.5, 空状态 py-6→py-4

**文件：** `UploadDialog.vue`

---

### U2. 删除项目列表中的"上传"按钮 — ✅ 已修复

**改动：** 移除 HomeView 项目卡片的上传按钮（`Upload` 图标引用、按钮 HTML 代码），仅保留"详情"按钮和下拉菜单。

**文件：** `HomeView.vue`

---

### U3. 上传选项补充说明 — ✅ 已修复

**改动：** UploadDialog "新增"/"修复" 单选项下方增加 subtitle 说明文字：

- 新增 → "次版本号 +1，新增功能"
- 修复 → "补丁版本号 +1，问题修复"

**文件：** `UploadDialog.vue`

---

## P2 — 代码审查遗留（建议修复）

| #    | 问题                         | 文件                                               | 状态 |
| ---- | ---------------------------- | -------------------------------------------------- | ---- |
| P2-1 | `utils/errors.ts` 死代码     | `src/renderer/src/utils/errors.ts`                 | ✅   |
| P2-2 | 主进程 `AppError` 接口未使用 | `src/main/errors.ts:4-10`                          | ✅   |
| P2-3 | `VersionInfo` 类型重复定义   | `main/version/index.ts` vs `renderer/types/app.ts` | ✅   |
| P2-4 | `ProjectDraft` 类型双重维护  | `renderer/types/app.ts` vs `main/config/store.ts`  | ✅   |

---

## P3 — 代码审查遗留（可优化）

| #    | 问题                                     | 文件                                   | 状态 |
| ---- | ---------------------------------------- | -------------------------------------- | ---- |
| P3-1 | `process.noAsar` 全局副作用              | `src/main/fs/index.ts:10-18`           | ✅   |
| P3-2 | `scanFiles` / `scanRemoteFiles` 重复逻辑 | `src/main/fs/index.ts:47-154`          | ✅   |
| P3-3 | `el-radio` 废弃 `value` 属性             | `UploadDialog.vue:38`                  | ✅   |
| P3-4 | 远程目录为空时路径指到当前目录           | `ProjectConfigDialog.vue` / `store.ts` | ✅   |
| P3-5 | `electron.vite.config.ts` 多余配置       | `electron.vite.config.ts:17-23`        | ✅   |
| P3-6 | `onMounted` 未 await 异步函数            | `SettingsView.vue:207-209`             | ✅   |
| P3-7 | 主进程函数参数过多                       | `src/main/fs/index.ts:156,250`         | ✅   |
| P3-8 | 扫描失败仍可点击"开始上传"               | `UploadDialog.vue`                     | ✅   |
| P3-9 | 下载对话框缺少文件预览                   | `DownloadDialog.vue`                   | ✅   |

---

## 优先级建议

### 第三优先 — 新功能

| 优先级 | 内容                                | 类型 |
| ------ | ----------------------------------- | ---- |
| 1      | **F3** — 当前下载版本标识           | 🟢   |
| 2      | **F4** — 权限设计（需确认产品边界） | 🟢   |
