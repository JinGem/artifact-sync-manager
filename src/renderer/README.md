# Renderer 模块

> 本文是 `src/renderer/src/` 的模块参考，说明页面组织、状态、主题和与主进程的调用方式。

## 职责

渲染层实现 Vue 3 单页应用。页面位于 `views/`，可复用组件位于 `components/`，Pinia store 位于 `stores/`，路由位于 `router/`，主题位于 `styles/`。`src/renderer/src/main.ts` 创建 Vue 应用，`App.vue` 提供窗口布局、首次用户配置和远程变化通知。

## 页面与布局

`App.vue` 使用 `flex h-full flex-col` 容器：顶部为 `WindowHeader.vue`，下方是可滚动内容区，内部渲染 `RouterView`。窗口控制按钮调用 `window.artifactSync` 的窗口方法。

| 路由                  | 页面                    | 主要内容                     |
| --------------------- | ----------------------- | ---------------------------- |
| `/`                   | `HomeView.vue`          | 产品入口、项目列表和项目配置 |
| `/project/:projectId` | `ProjectDetailView.vue` | 版本列表、上传、下载和删除   |
| `/tasks`              | `TaskCenterView.vue`    | 任务进度、失败重试和清理     |
| `/settings`           | `SettingsView.vue`      | 用户资料、配置导入导出和重置 |

## 状态与 IPC

`useTaskStore()` 在内存中保存最近 50 条上传/下载任务，提供新增、更新、失败重试、清理已完成和清空操作。项目、用户资料和版本数据通过 `window.artifactSync` 调用主进程；进度、版本删除和远程变化通过对应监听器回传。

渲染层只能使用 [src/preload/index.ts](../preload/index.ts) 暴露的方法。禁止在该目录引入 Node 内置模块，禁止直接使用 `ipcRenderer`。

## 主题

[main.css](src/styles/main.css) 以 `--as-*` 定义颜色、圆角、阴影和字体，使用 `light-dark()` 跟随系统深浅色，再通过 Tailwind `@theme` 映射为 `bg-page`、`text-fg`、`border-line`、`bg-accent-soft` 等语义工具类。[element/index.scss](src/styles/element/index.scss) 在构建时覆盖 Element Plus 的 SCSS 变量，组件覆盖集中在 `main.css` 的 Element Plus 变量区域。

新增颜色或表面先扩展 `--as-*` 和 `@theme`，组件内使用语义类，不写死色值。修改主题后验证浅色、暗色、弹窗、表单、表格和任务进度。

## 验证

渲染层行为改动至少手动检查项目创建/编辑、上传、下载、删除、任务重试以及浅色/暗色切换，并运行：

```sh
npm run typecheck
npm run build
```
