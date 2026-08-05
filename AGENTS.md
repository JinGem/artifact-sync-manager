# Repository Guidelines

## 项目结构与模块组织

本项目是一个 Electron + Vue 3 桌面应用，用于在内网共享目录上上传、下载和管理构建产物的版本。无后端、无数据库，状态持久化在本机 JSON 文件中。

- `src/main/` — Electron 主进程（Node.js）：IPC 处理（`ipc/`）、文件系统操作（`fs/`）、配置持久化（`config/`）、版本管理（`version/`）、任务执行（`task/`）、项目逻辑（`project/`）、目录监控（`watch/`）、系统托盘（`tray/`）。
- `src/preload/` — contextBridge 安全桥接层，对外暴露类型化的 `window.artifactSync` API。
- `src/renderer/src/` — Vue 3 单页应用：`views/`、`components/`、`stores/`（Pinia）、`router/`、`styles/`、`types/`、`utils/`。
- `src/shared/` — 主进程与渲染进程共享的类型定义。
- `scripts/` — 构建期工具脚本（如图标生成）。
- `docs/` — 产品文档与界面截图。

构建产物输出到 `out/`，打包安装程序输出到 `release/`。

## 构建、测试与开发命令

- `npm run dev` — 启动 Electron 应用并开启热重载（HMR）。
- `npm run typecheck` — 仅执行 `vue-tsc --noEmit` 类型检查。
- `npm run lint` / `npm run lint:fix` — 运行 ESLint（含 Prettier 规则）；`lint:fix` 自动修复问题。
- `npm run build` — 生成图标、类型检查并产出生产构建到 `out/`。
- `npm run preview` — 预览生产构建。
- `npm run pack` — 构建并生成 Windows NSIS 安装包到 `release/`。

## 代码风格与命名约定

- TypeScript 启用严格模式；使用路径别名 `@main/*`、`@renderer/*`、`@shared/*`。
- 格式由 Prettier 强制（2 空格缩进、双引号、分号、每行 100 列），并纳入 ESLint 检查。
- IPC 通道采用 `domain:action` 命名（如 `upload:start`、`project:save`）。业务逻辑放在 `src/main/`，UI 组件保持轻量。
- 渲染进程禁止直接引入 Node 内置模块，所有特权操作必须通过 `window.artifactSync`。
- 遵循 `CONTEXT.md` 中的小步提交原则：优先做聚焦的小改动，避免大范围模块重写。

## 测试规范

仓库当前未配置自动化测试框架。在补充测试之前，每次改动必须通过 `npm run typecheck` 与 `npm run build`，并进行手动验证（创建/编辑项目、上传/下载版本、检查任务中心）。

## 提交与 Pull Request 规范

- 提交信息遵循 `<type>: <summary>` 格式（如 `feat:`、`fix:`、`chore:`）；近期历史在类型后使用简洁的中文摘要。
- 保持小且聚焦的提交，不要混入无关模块的改动。
- 提交 PR 前运行 lint、typecheck 和 build。若改动影响产品边界或架构，同步更新 `CONTEXT.md` 或 `ARCHITECTURE.md`。
- PR 应说明问题与解决方案、关联相关 issue，UI 改动需附带截图。