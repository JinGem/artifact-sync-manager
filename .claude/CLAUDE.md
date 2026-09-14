# Claude Code 项目指引 — 版本同步助手 (Artifact Sync Manager)

本文件是 Claude Code 的薄索引。完整规则见下列单一事实来源，不在本文件重复维护。

## 导入的文档

- `@../AGENTS.md` — 任务阅读地图和硬性规则。
- `@../docs/AGENTS.md` — 文档层级、写作规则、审计清单和校验要求。
- `@../docs/architecture.md` — 进程模型、IPC、本地状态和远程版本结构。
- `@../CONTEXT.md` — 技术约定、工程原则、提交和发版规则。
- `@../.agents/notes/README.md` — 决策记录的格式和生命周期；历史取舍在该目录下查询。

## 工作流

- **可用命令**：`/page`、`/component`、`/service`、`/verify`、`/commit`、`/release`。
- **任务定位**：先读根 `AGENTS.md` 的任务地图；涉及文档时先读 `docs/AGENTS.md`。
- **代码验证**：修改 `src/` 后运行 `npm test`、`npm run typecheck` 与 `npm run build`。
- **文档验证**：新增或修改 Markdown 后运行 `npm run verify:docs`。
- **doc-sync 收尾**：检查代码行为是否影响模块 README、`docs/architecture.md` 或产品文档；非平凡取舍新增或更新决策记录。
- **敏感区域**：`.github/workflows/*.yml`、`.env*`、release-please 配置和 Claude 权限文件的改动需要人工确认；除非用户明确要求，否则不要自动修改。
- **发版**：由 release-please 根据 Conventional Commits 自动推进，`package.json` 是版本唯一来源，不手动修改 tag 或版本号。
