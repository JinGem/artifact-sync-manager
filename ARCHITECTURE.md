# Architecture Guide

> 面向 AI 编码助手和新加入开发者的完整架构指南。

## Commands

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Electron 开发服务器（HMR） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | 仅运行 Vue TypeScript 类型检查 |
| `npm run preview` | 预览生产构建 |

## Application Overview

Artifact Sync Manager 是一个 Electron + Vue 3 桌面应用，用于将构建产物上传/下载到网络共享目录。**无后端服务、无数据库**，所有状态通过本地 JSON 文件持久化。

目标用户：公司内网开发者。支持环境：Windows 10/11。远程存储通过直接路径（如 `\\192.168.1.88\home\projects`）或本地磁盘路径访问。

## 三进程架构

```
src/
├── main/          ← Electron 主进程（Node.js）
├── preload/       ← 安全桥接（contextBridge + ipcRenderer）
└── renderer/src/  ← Vue 3 前端
```

### 主进程 `src/main/`

处理所有文件系统操作、任务执行（上传/下载）和状态持久化。IPC 处理器在 `src/main/index.ts` 中注册，通过 `ipc/` 下的独立模块组织。`config/store.ts` 管理单个 `app-state.json` 文件（操作者名称 + 项目列表）。上传/下载任务执行在 `main/ipc/upload.ts` 和 `main/ipc/download.ts` 中。

**新增模块：**
- `src/main/watch/directory-watcher.ts` — `WatcherService` 单例，30s 轮询 + `fs.watch` 监控远程目录版本变化
- `src/main/tray/index.ts` — 系统托盘（哆啦A梦图标 + 右键菜单），关闭到托盘行为
- `src/main/tray/tray-icon.png` — 32×32 托盘图标（构建时自动生成）
- `src/main/tray/app-icon.png` — 256×256 应用图标（构建时自动生成）

### Preload `src/preload/index.ts`

通过 `contextBridge.exposeInMainWorld` 暴露严格类型的 `window.artifactSync` API（14 个方法 + 3 个监听器）。渲染层不得直接访问 Node.js API。每个主进程操作都通过 `ipcRenderer.invoke()` 调用。API 分类：配置 CRUD、文件对话框、版本操作、上传/下载进度回调、设置、远程目录变化监听。

### 渲染层 `src/renderer/src/`

标准 Vue 3 SPA，使用 Vue Router（hash 模式）、Pinia Store 和 Element Plus UI 组件。`types/app.ts` 定义共享数据模型：`AppSettings`、`ProjectConfig`、`AppState`、`VersionInfo`、`UploadOptions`、`DownloadOptions`、`UploadProgress`、`DownloadProgress`。

## 渲染层布局

**App.vue** 为根布局：

```
┌─ flex h-full flex-col ──────────────────┐
│ Header (h-11 shrink-0, nav + tools)     │
├──────────────────────────────────────────┤
│ flex-1 overflow-y-auto (scrolling body)  │
│ ┌─ RouterView ────────────────────────┐  │
│ │ HomeView / ProjectDetailView /       │  │
│ │ TaskCenterView / SettingsView        │  │
│ └──────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

滚动容器：`html { overflow: hidden }` → `#app { overflow: hidden }` → 内容区 `flex-1 overflow-y-auto`。滚动条仅出现在 Header 下方。Router 包含 `scrollBehavior({ top: 0 })` 在路由切换时重置滚动位置。

## 路由页面

| 路由 | 组件 | 内容 |
|------|------|------|
| `/` | HomeView.vue | 软件介绍、当前工作区、项目列表 + CRUD 弹窗 |
| `/project/:projectId` | ProjectDetailView.vue | 项目信息卡片 + 版本扫描列表 + 上传/下载弹窗 |
| `/tasks` | TaskCenterView.vue | 上传/下载任务记录、进度条、状态标签、重试 |
| `/settings` | SettingsView.vue | 操作者名称编辑、配置导入导出、关于信息、数据重置 |

## 可复用组件

- **`ProjectConfigDialog.vue`** — 模态弹窗中创建/编辑项目表单（名称、远程目录、上传/下载路径、规则）
- **`UploadDialog.vue`** — 版本号选择（minor/patch + 可选 major）、文件扫描预览、上传进度动画、完成后自动关闭
- **`DownloadDialog.vue`** — 下载模式（overwrite/clear）、下载进度、完成后自动关闭

## 状态管理

- **`taskStore`**（Pinia, `stores/taskStore.ts`）— 内存级任务记录，支持失败任务重试和清除操作，上限 50 条，应用重启后丢失
- **持久化状态**（操作者名称、最近项目 ID、项目列表）由主进程 `appStateStore`（`src/main/config/store.ts`）管理，通过 IPC 读写。Store 校验唯一性、自动去除首尾空格、在创建/更新时自动设置 `recentProjectId`

## 数据流

```
UI Component → window.artifactSync.someMethod()
  → ipcRenderer.invoke('channel:action', args)
    → main process ipcMain.handle()
      → appStateStore (read/write app-state.json)
        → return new AppState to renderer
```

所有变更走主进程：读取当前状态 → 修改 → 写回磁盘 → 返回新状态。渲染层无直接文件访问。基于事件的上传/下载进度使用 `ipcRenderer.on()`，通过返回的取消函数清理。

## 主题系统

暗色主题通过 4 层 CSS + 构建时 SCSS 实现（均在 `src/renderer/src/styles/` 下）：

1. **Layer 0**（`main.css`）— 滚动容器锁定（html/body/#app: `overflow: hidden`）
2. **Layer 1**（`main.css`）— 重置、字体、`color-scheme: dark`
3. **Layer 2**（`main.css` `:root`）— 自定义 CSS 变量（`--bg-*`、`--text-*`、`--border-*`、`--radius-*`、`--shadow-*`）+ Element Plus 全局 CSS 变量暗色覆盖（`--el-fill-color-*`、`--el-border-*`、`--el-text-*`、`--el-bg-color-*`）
4. **Layer 3**（`main.css`）— Element Plus 组件 CSS 变量覆盖（button、dialog、input、notification；零 `!important`；毛玻璃效果通过 `backdrop-filter`）
5. **构建时 SCSS**（`styles/element/index.scss`）— `@forward 'element-plus/theme-chalk/src/common/var.scss' with ($colors: ...)` 在编译时注入 primary/success/danger/warning 颜色

### 关键原则

- 优先使用 Element Plus 内置 CSS 变量接口（`--el-*`），而非直接覆盖底层 CSS 属性
- `main.css` 在 Element Plus SCSS 之后加载，同选择器自然覆盖，无需 `!important`
- Element Plus 底层链式引用（如 `--el-button-bg-color: var(--el-fill-color-blank)`）需在 `:root` 层覆盖 `--el-fill-color-blank` 等全局变量

## 远程目录监控

由 `src/main/watch/directory-watcher.ts` 的 `WatcherService` 单例负责：

```
app.whenReady()
  → watcherService.setOnChange(callback)
  → 遍历所有项目 → watcherService.addPath(dir, projectId, projectName)
  → watcherService.start()
    → 每个目录: fs.watch(recursive:false) + setInterval(poll, 30_000)
    → 首次 poll 建立 snapshot 基线，不触发事件
    → 后续 poll 对比 snapshot → 生成 RemoteChangeEvent[]
    → callback → Notification API (系统通知) + webContents.send (渲染层通知)
```

**路径去重**：同一远程目录被多个项目引用时共享一个 `WatcherEntry`。项目 CRUD 时同步更新。

## 系统托盘

由 `src/main/tray/index.ts` 的 `createTray()` 函数创建：

- 图标：哆啦A梦 PNG（32×32），`findIconPath()` 三级路径兜底，失败回退蓝色 bitmap
- 点击托盘 → 显示/聚焦窗口
- 右键菜单 → "显示窗口"/"退出"
- 关闭事件拦截：`window.on('close')` 中 `hide()` 替代 `close()`，`app.on('before-quit')` 时释放

## 应用图标生成

`scripts/generate-icon.cjs` — 使用纯 Node.js 内置模块生成哆啦A梦风格图标：

| 输出文件 | 尺寸 | 用途 |
|---------|------|------|
| `src/main/tray/tray-icon.png` | 32×32 | 托盘图标 |
| `src/main/tray/app-icon.png` | 256×256 | 窗口图标 + 打包 exe 图标 |

`generate-icon.cjs` 在 `npm run build` 前自动执行，构建后复制到 `out/main/`。打包时通过 `extraResources` 包含。

版本存储在：`<remote-root>/<version>/`（没有项目名在路径中——`remoteDirectory` 就是根目录）。
在每个版本目录中，上传的源文件夹作为子目录保留。

```
\Remote\                       ← remoteDirectory 配置值
  └── v1.0.0\
      ├── .version.json        ← 元数据（包含 sourceFolderName）
      └── win-test\            ← 保留的源文件夹名
          ├── file-a.txt
          └── sub\
              └── file-b.txt
```

`.version.json` 放置在版本根级别（与源文件夹同级），包含 `sourceFolderName` 字段，供下载时还原本地路径。此结构允许在没有应用的情况下手动检查。

**下载流程**：读取 `.version.json` → 还原源文件夹名 → 下载到 `<local-path>/<source-folder-name>/`。

## 错误码系统

8 个预定义错误码（在 `utils/errors.ts` 中）：

| 错误码 | 说明 |
|--------|------|
| `PATH_NOT_FOUND` | 路径不存在 |
| `REMOTE_NOT_ACCESSIBLE` | 远程目录不可访问 |
| `PERMISSION_DENIED` | 权限不足 |
| `FILE_LOCKED` | 文件被占用 |
| `NETWORK_INTERRUPTED` | 网络中断 |
| `DISK_FULL` | 磁盘空间不足 |
| `VERSION_DUPLICATED` | 版本号重复 |
| `TASK_CANCELLED` | 任务已取消 |

错误通过 `ElNotification`（toast）+ 任务记录中的内联错误显示呈现。

## 上传/下载流程概览

**上传**：项目详情页 → 点击"上传版本" → 弹窗显示版本自动递进（minor/patch + 可选 major）+ 文件描述 → 点击"开始上传" → 按规则扫描文件 → 预览列表 → 传输带进度 → 完成通知 → 自动关闭弹窗。

**下载**：项目详情页 → 选择一个版本 → 点击"下载" → 弹窗显示下载模式（overwrite/clear）→ 点击"开始下载" → 读取 `.version.json` 获取源文件夹名 → 扫描 `<version>/<source-folder>/` 下的远程文件 → 传输带进度 → 完成通知 → 自动关闭弹窗。

## 代码结构约定

### `src/main/` 只处理
配置读写、文件系统操作、上传下载任务控制、IPC 注册。不包含页面状态或表单逻辑。

### `src/preload/` 要求
只暴露必要安全 API，不暴露 Node 原始高权限能力。接口命名需稳定明确。

### `src/renderer/src/` 目录结构
```
views/         ← 页面级视图
components/    ← 可复用组件
stores/        ← Pinia 状态管理（taskStore）
router/        ← Vue Router
services/      ← 前端调用桥接 API 的服务层（预留）
types/         ← 共享类型定义（app.ts）
utils/         ← 工具函数
styles/        ← main.css + styles/element/index.scss
```
