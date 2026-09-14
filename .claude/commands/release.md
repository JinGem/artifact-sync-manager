---
description: 发版流程指引（release-please 自动发版）
---

请按本项目的发版规范处理发版流程。

## 规则（AGENTS.md 发版规范）

- 版本由 **release-please** 根据 Conventional Commits 自动推断（`fix` → patch、`feat` → minor、破坏性变更 → major），自动更新 `package.json` 版本、`CHANGELOG.md` 并打 tag。
- `package.json` 是**版本唯一来源**；**不得**手动修改版本号或手动打 tag，避免与 release-please 脱节。
- 破坏性变更需在提交信息中使用 `BREAKING CHANGE` 或 `!` 前缀。

## 步骤

1. 检查自上个 tag 以来的提交是否符合 Conventional Commits（`git log --oneline <上次tag>..HEAD`），确保需要发版的 `feat` / `fix` 均已规范提交。
2. 确认主分支已合入待发布改动，将改动 push 到 `master`（release-please 工作流会自动触发）。
3. 跟踪 `.github/workflows/release-please.yml` 生成的 Release PR：合并后由 `v*` tag 触发 Windows 打包上传。
4. 发版完成后向用户报告：新版本号、CHANGELOG 摘要、安装包是否已上传。
5. 若 `v*` 打包失败，先检查 CI 日志定位问题，不要手动绕过 release-please 流程。
