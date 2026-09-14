---
description: 根据 git diff 生成符合 commitlint 的中文提交信息
---

请根据当前改动生成一个符合本项目提交规范的提交信息。

## 步骤

1. 运行 `git status` 查看改动范围；运行 `git diff --staged` 查看已暂存改动（无暂存时用 `git diff` 查看工作区改动）。
2. 按 `CONTEXT.md` 与 `docs/AGENTS.md` 的规范生成提交信息：
   - 格式：`<type>: <简洁中文摘要>`
   - 类型限：`feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert` `init`
   - 摘要聚焦单一意图，不混入无关模块。
3. 保持小且聚焦的提交。
4. 给出建议的完整提交信息，由用户确认后执行 `git commit`。

## 检查

- 提交信息能通过 commitlint。
- 非平凡取舍已有 `.agents/notes/` 决策记录。
- 代码行为变化已同步受影响文档。
- 提交前运行 `npm run verify:docs`，并在需要时运行 lint、typecheck、build。
