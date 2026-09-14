# Renderer 模块

> 本文是 `src/renderer/src/` 的模块参考，说明页面组织、状态、主题和与主进程的调用方式。

## 职责

渲染层实现 Vue 3 单页应用。`src/renderer/src/main.ts` 创建应用，`App.vue` 提供窗口布局、首次用户配置和远程变化通知。

## 页面与布局

`App.vue` 使用 `flex h-full flex-col` 容器：顶部为 `WindowHeader.vue`，下方是可滚动内容区，内部渲染 `RouterView`。窗口控制按钮调用 `window.artifactSync` 的窗口方法；所有弹窗通过 Element Plus `alignCenter` 垂直居中，超高时只滚动内容区。首页按组渲染 `ProjectCard.vue`；组区块可折叠，新建项目时可输入新组名称。组颜色由 `ProjectGroupDialog.vue` 编辑，并显示在组标题和项目所属组选择器中。

| 路由                  | 页面                    | 主要内容                     |
| --------------------- | ----------------------- | ---------------------------- |
| `/`                   | `HomeView.vue`          | 产品入口、项目列表和项目配置 |
| `/project/:projectId` | `ProjectDetailView.vue` | 版本列表、上传、下载和删除   |
| `/tasks`              | `TaskCenterView.vue`    | 任务进度、失败重试和清理     |
| `/settings`           | `SettingsView.vue`      | 用户资料、配置导入导出和重置 |

## 状态与 IPC

`useTaskStore()` 在内存中保存最近 50 条上传/下载任务，提供新增、更新、失败重试、清理已完成和清空操作。项目、组、用户资料和版本数据通过 `window.artifactSync` 调用主进程；首页使用版本摘要显示超过 10 个版本的提醒，并可由研发清理过期版本。

渲染层只能使用 [src/preload/index.ts](../preload/index.ts) 暴露的方法。禁止在该目录引入 Node 内置模块，禁止直接使用 `ipcRenderer`。

## 版本显示

项目详情页通过 `@shared/version-retention` 统一判断近 7 天和过期版本。默认表格只显示近 7 天版本，`查看更多` 切换到全部；日期优先显示 `.version.json` 的 `uploadedAt`，缺失时回退目录创建时间。

## 主题

[main.css](src/styles/main.css) 以 `--as-*` 定义颜色、圆角、阴影和字体，使用 `light-dark()` 跟随系统深浅色，再通过 Tailwind `@theme` 映射为 `bg-page`、`text-fg`、`border-line`、`bg-accent-soft` 等语义工具类。[element/index.scss](src/styles/element/index.scss) 在构建时覆盖 Element Plus 的 SCSS 变量，组件级覆盖集中在 `main.css`。

新增颜色或表面先扩展 `--as-*` 和 `@theme`，组件内使用语义类，不写死色值。修改主题后验证浅色、暗色、弹窗、表单、表格和任务进度。

## 验证

渲染层行为改动至少手动检查项目创建/编辑、上传、下载、删除、任务重试以及浅色/暗色切换，并运行：

```sh
npm run typecheck
npm run build
```
