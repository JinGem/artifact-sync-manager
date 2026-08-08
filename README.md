# 版本同步助手

面向公司内网开发者的 Windows 桌面工具，用于管理项目产物的上传、下载和版本记录。**无后端服务、无数据库**，所有状态持久化在本地 JSON 文件中。

## 快速开始

```bash
npm run dev      # 启动 Electron 开发服务器（HMR）
npm run build    # 类型检查 + 生产构建
npm run typecheck # 仅类型检查
npm run preview  # 预览生产构建
```

## 一分钟理解架构

```
src/
├── main/           ← Electron 主进程（Node.js）：文件操作、任务执行、配置持久化
├── preload/        ← 安全桥接层（contextBridge），暴露 window.artifactSync API
└── renderer/src/   ← Vue 3 SPA（Element Plus + Tailwind CSS + Pinia）
```

**数据流**：UI 组件 → `window.artifactSync.method()` → `ipcRenderer.invoke()` → 主进程 `ipcMain.handle()` → 读写 JSON 配置文件 → 返回结果。

**4 个路由页面**：首页（项目列表与 CRUD）、项目详情（版本浏览 + 上传/下载）、任务中心（进度与重试）、设置页。

**系统托盘**：关闭窗口隐藏到托盘，单实例锁防重复启动，右键菜单显示窗口/退出。
**无边框窗口**：自定义标题栏（拖拽移动 + 最小化/最大化/关闭），窗口控制按钮内嵌于应用 Header。

**远程目录监控**：WatcherService 自动检测远程版本变化，弹窗 + 系统通知双提醒。

**应用图标**：窗口标题栏/任务栏/托盘统一哆啦A梦风格图标。

**主题**：GitHub 风格（浅色为主、跟随系统暗色），哆啦A梦蓝/红/黄做点缀；通过 `light-dark()` 设计令牌 + Tailwind `@theme` 映射 + 构建时 SCSS 变量覆盖实现，零 `!important`。

## 产品边界

- 纯桌面端，不引入后端服务、数据库、账号系统
- 直接访问本地路径和远程目录（共享路径）
- 版本号语义化自动递进（major/minor/patch）
- 上传/下载规则使用 `.gitignore` 语法

更多细节见 [ARCHITECTURE.md](./ARCHITECTURE.md) 和 [CONTEXT.md](./CONTEXT.md)。
