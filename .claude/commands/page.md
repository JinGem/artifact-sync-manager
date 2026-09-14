---
description: 生成新路由页面脚手架（Vue 3 + Router + 主题约定）
argument-hint: [页面名称，kebab-case，如 project-settings]
---

请生成一个新的路由页面，遵循本项目既有约定（参考 [SettingsView.vue](../../src/renderer/src/views/SettingsView.vue) 与 [HomeView.vue](../../src/renderer/src/views/HomeView.vue) 的页面结构）。

## 步骤

1. 在 `src/renderer/src/views/` 创建 `<页面名称>.vue`，文件名用 kebab-case。
2. 页面结构参考现有视图：
   - 外层 `<main class="mx-auto flex min-h-[calc(100vh-var(--spacing)*14)] max-w-4xl flex-col gap-6 px-6 py-8 lg:px-10">`
   - 头部区：返回按钮（如需要）+ `text-2xl font-semibold text-fg` 标题
   - 内容区块用 `el-card shadow="never"` + `#header` 插槽标题
   - 信息块用 `rounded-md border border-line bg-canvas px-4 py-3.5`（标签 `text-xs text-subtle`、值 `font-mono text-sm text-fg-2`）
3. 在 `src/renderer/src/router/index.ts` 注册路由：`createWebHashHistory` + 命名路由，按 `path` / `name` / `component` 三字段，引用 `@renderer/views/<Name>.vue`。
4. 若页面需要操作者（operator）信息，从 Pinia store 或现有 IPC（`config:get-state`）获取，不直接访问 Node。

## 强制约定

- TypeScript 严格模式；渲染层用 `@renderer/*` 别名，禁止引入 Node 内置模块，特权操作一律走 `window.artifactSync`。
- 样式使用主题语义工具类（`bg-page` / `text-fg` / `border-line` / `bg-accent-soft` / `text-danger` 等），不写死色值；路径/版本号用 `font-mono`。
- 保持页面组件轻量，业务逻辑放 `src/main/`，通过 IPC 调用。
- 完成后运行 `/verify`（文档校验 + typecheck + build）确认无回归。
