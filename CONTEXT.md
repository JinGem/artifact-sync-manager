# 工程协作上下文

> 本文件保存代理和贡献者需要遵守的工程约束。产品范围见 [docs/产品文档.md](docs/产品文档.md)，系统事实见 [docs/architecture.md](docs/architecture.md)，文档写法见 [docs/AGENTS.md](docs/AGENTS.md)。

## 产品边界

- 纯 Electron 桌面端，不引入后端服务、数据库、账号系统或 ORM。
- 直接访问本地目录和内网共享目录。
- 本地状态使用 JSON 文件持久化，远程版本使用目录和 `.version.json` 表达。
- 产品边界变化必须同步更新 [docs/产品文档.md](docs/产品文档.md)。

## 工程原则

1. 不保留向后兼容。废弃路径直接删除，不新增兼容层、迁移器或 fallback。
2. 选择满足当前需求的最简单实现，不为假设中的未来需求增加抽象或配置层。
3. 先跑通端到端闭环，再增加能力；不得为了未完成的重构拆掉运行中的功能。
4. 组件和主进程模块保持单一职责，跨层调用必须走明确接口。
5. 优先使用已有依赖和成熟维护的库；新增依赖前先检查现有能力。
6. 架构选择按长期维护评估，不接受临时方案。
7. 优先采用成熟产品验证过的模式，不自行发明复杂机制。
8. 保持小步、聚焦的提交，不混入无关模块改动。

## 技术约定

- 技术栈：Electron、Vue 3、TypeScript、Tailwind CSS、Element Plus、Pinia、Vue Router、electron-vite。
- TypeScript 使用严格模式；路径别名使用 `@main/*`、`@renderer/*`、`@shared/*`。
- Prettier 使用 2 空格缩进、双引号、分号、100 列、LF。
- IPC 通道使用 `domain:action` 命名；业务逻辑位于 `src/main/`，IPC handler 只负责接线和参数校验。
- 渲染进程禁止引入 Node 内置模块，特权操作统一通过 `window.artifactSync`。
- 跨进程共享类型放在 `src/shared/`；渲染层类型放在 `src/renderer/src/types/`。
- 应用版本以 `package.json` 为唯一来源，经构建注入和 preload 暴露，不在 UI 中硬编码。

## 变更归属

- 代码行为、路径或限制变化：更新模块 README、[docs/architecture.md](docs/architecture.md) 或产品文档。
- 产品边界变化：先更新 [docs/产品文档.md](docs/产品文档.md)。
- 非平凡设计取舍：新增或更新 [.agents/notes/README.md](.agents/notes/README.md) 下的决策记录。
- 纯机械改动不新增文档。

## 提交与发版

- 提交信息使用 `<type>: <summary>`，类型由 commitlint 校验，摘要使用简洁中文。
- Husky 的 `pre-commit` 运行 lint-staged 和文档检查，`commit-msg` 校验提交信息，`pre-push` 运行 typecheck。
- GitHub Actions 在 push 和 PR 时运行 lint、typecheck、build 与 Windows 打包验证。
- release-please 根据 Conventional Commits 更新版本和 CHANGELOG；不得手工修改版本号或 tag。

## 验证

```sh
npm run lint
npm run typecheck
npm run build
npm run verify:docs
```

代码改动必须执行前 3 项。文档改动必须执行 `npm run verify:docs`；无法执行的项目必须在交付说明中列出。
