---
description: 运行项目验证（typecheck、build、文档校验）
---

请对当前改动执行项目规定的验证流程。

## 步骤

1. 运行 `npm run verify:docs`，检查链接、预算和决策记录格式。
2. 若修改了 `src/`，运行 `npm run typecheck`。
3. 若修改了 `src/`、构建配置或依赖，运行 `npm run build`。
4. 依次报告每步结果；失败时给出具体错误位置与修复建议，修复后重新运行。
5. 若改动涉及渲染层 UI，额外提示手动验证项目 CRUD、上传/下载、任务中心和浅色/暗色主题。
