# AGENTS.md — 版本同步助手代理工作守则

> 本文件是 Codex、Claude Code 等代理的唯一必读入口。先按任务地图读取对应文档，再开始修改。
> 版本同步助手是 Electron + Vue 3 + TypeScript 桌面应用；无后端、无数据库，状态持久化在本机 JSON 文件。

## 任务 → 先读什么

| 任务                                     | 必读                                                                                           | 何时读 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ------ |
| 改渲染进程、页面、组件、主题或任务中心   | [docs/architecture.md](docs/architecture.md)、[src/renderer/README.md](src/renderer/README.md) | 动手前 |
| 改主进程、文件操作、版本、任务或目录监控 | [docs/architecture.md](docs/architecture.md)、`src/main/` 对应模块源码                         | 动手前 |
| 改 preload 或 IPC                        | [docs/architecture.md](docs/architecture.md)、[CONTEXT.md](CONTEXT.md)、`src/preload/index.ts` | 动手前 |
| 改产品边界、业务规则或交互原则           | [docs/产品文档.md](docs/产品文档.md)、[CONTEXT.md](CONTEXT.md)                                 | 动手前 |
| 改构建、依赖、提交或发版                 | [CONTEXT.md](CONTEXT.md)、[package.json](package.json)                                         | 动手前 |
| 写或改任意 Markdown                      | [docs/AGENTS.md](docs/AGENTS.md)                                                               | 动笔前 |
| 做设计决策或改行为                       | [.agents/notes/README.md](.agents/notes/README.md) 及其分类目录                                | 决策前 |
| 排查历史设计原因                         | [.agents/notes/](.agents/notes/)                                                               | 修改前 |

## 仓库地图

```text
src/main/          Electron 主进程：窗口、托盘、文件、版本、任务、配置、IPC
src/preload/       contextBridge 白名单桥接，暴露 window.artifactSync
src/renderer/      Vue 3 渲染进程：页面、组件、Pinia、主题
src/shared/        主进程与渲染进程共享类型
docs/              文档标准、系统地图、产品参考、可视化
.agents/notes/     决策记录：proposed / implemented / rejected / archived
scripts/           构建与文档校验脚本
```

## 硬性规则

- **doc-sync**：代码行为、路径、命令或限制发生变化时，在同一提交更新受影响的模块 README、[docs/architecture.md](docs/architecture.md) 或产品文档；规则见 [docs/AGENTS.md](docs/AGENTS.md)。
- **决策记录**：影响他人、影响未来或存在真实备选方案的改动，在同一 PR 新增或更新决策记录；机械改动豁免。
- **一事实一归属**：同一事实只在一处详述，其他文档链接到拥有者，禁止复制后各自维护。
- **现状只写现在**：历史、被放弃方案和计划不写入现状文档；设计原因写入决策记录。
- **禁止编造**：命令、路径、默认值、错误和平台行为必须读源码或实际运行验证。
- **代码分层**：渲染进程禁止引入 Node 内置模块；所有特权操作通过 `window.artifactSync`。主进程业务逻辑放在 `src/main/`，IPC 层只做接线和参数校验。
- **类型与格式**：TypeScript 严格模式，路径别名使用 `@main/*`、`@renderer/*`、`@shared/*`；遵循 Prettier 的双引号、分号和 100 列限制。
- **版本单一来源**：应用版本只读取 `package.json`，经构建注入和 preload 暴露；禁止在 UI 或文档中硬编码当前版本。
- **提交与发版**：提交遵循 Conventional Commits；依赖 Husky 的 `pre-commit`、`commit-msg`、`pre-push`，禁止 `--no-verify`。release-please 根据提交更新版本与 CHANGELOG。
- **UI 文案属于行为**：按钮、提示、错误文案的改动必须核查相应页面和交互，禁止顺手改写。

## 开发与验证

```sh
npm run dev             # 启动 Electron 开发环境
npm test                # Node 内置测试
npm run lint            # ESLint + Prettier
npm run typecheck       # vue-tsc --noEmit
npm run build           # 图标、类型检查、生产构建
npm run verify:docs     # 文档链接、预算、决策记录格式
npm run pack            # Windows NSIS 安装包
```

代码改动完成前必须运行 `npm test`、`npm run typecheck` 与 `npm run build`。只改文档时也必须运行 `npm run verify:docs`；涉及提交时同时确认 lint 通过。

## 任务收尾自检

- [ ] 代码行为变化是否已同步到正确的文档层级。
- [ ] 非平凡取舍是否已有决策记录并包含 `## Alternatives considered`。
- [ ] 是否运行 `npm run verify:docs`，且链接、预算、笔记格式全部通过。
- [ ] 代码改动是否运行 `npm test`、`npm run typecheck` 与 `npm run build`。
- [ ] 最终回复是否明确列出验证命令、结果和未验证项。

本文件有字数预算，规则见 [docs/AGENTS.md](docs/AGENTS.md#预算与格式)，清单见 [scripts/doc-budgets.json](scripts/doc-budgets.json)。
