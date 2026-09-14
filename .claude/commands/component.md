---
description: 生成 Vue 组件（Element Plus + 主题系统约定）
argument-hint: [组件名 + 用途说明，如 "ProjectCard 项目卡片，展示项目名/路径/最近版本"]
---

请生成一个新的 Vue 组件，遵循本项目的主题系统与代码约定。

## 主题系统（哆啦A梦蓝/红/黄点缀，GitHub 风格浅/暗色）

- 构建时语义色：`primary #0099ff`（哆啦蓝）、`success #1a7f37`、`danger #cf222e`、`warning #9a6700`，注入在 `src/renderer/src/styles/element/index.scss`。
- 运行时设计令牌全部走 `--as-*` 变量（`light-dark()` 双值），映射为 Tailwind 语义工具类：`bg-page`/`bg-canvas`、`text-fg`/`text-muted`/`text-subtle`、`border-line`/`border-line-soft`、`bg-accent-soft`/`text-accent`/`text-danger`、`rounded-*`、`shadow-*`、`font-mono`。**不写死色值。**
- 覆盖 Element Plus 组件一律通过 `--el-*` CSS 变量接口（如 `.el-input` → `--el-input-*`、`.el-dialog` → `--el-dialog-*`），**零 `!important`**；新增覆盖写入 `src/renderer/src/styles/main.css` Layer 3 区域。
- 常用 UI 模式：卡片 `rounded-lg border border-line bg-page p-5 shadow-sm`；标签统一用 span（不用 el-tag）`inline-flex h-5 items-center rounded-full border border-accent-line bg-accent-soft px-2 text-[11px] leading-5 text-accent`；选择卡片选中态 `border-accent-line bg-accent-soft`。

## 代码约定

- 渲染层路径用 `@renderer/*` 别名；props/emits 使用 TypeScript 类型化（`defineProps<{...}>()` / `defineEmits<{...}>()`）。
- 组件轻量，不直接访问 Node/文件系统；数据经 `window.artifactSync` 的 IPC 获取。
- 参考 [UploadDialog.vue](../../src/renderer/src/components/UploadDialog.vue) 作为主题实践示例。

## 步骤

1. 在 `src/renderer/src/components/` 创建 `<组件名>.vue`（PascalCase 文件名）。
2. 按用途实现模板 + 脚本 + 样式，遵循上述主题约定。
3. 完成后运行 `/verify`（文档校验 + typecheck + build）确认无回归。
