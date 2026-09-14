---
description: 生成主进程模块 + IPC（domain:action 命名约定）
argument-hint: [模块名 + 功能说明，如 "backup 备份与恢复项目配置"]
---

请生成一个主进程模块并接通 IPC，遵循本项目的三进程通信模式。

## 现有模式（参考 [config.ts](../../src/main/ipc/config.ts)）

1. 在 `src/main/ipc/` 创建 `<模块>.ts`，导出一个 `register<Xxx>Ipc` 函数：
   - 用 `ipcMain.handle("domain:action", ...)` 注册，通道名遵循 `domain:action`（如 `config:get-state`、`config:save-project`）。
   - 业务逻辑放在 `src/main/` 对应分类目录（`fs/` `config/` `version/` `task/` `project/` `watch/`），IPC 层只做参数校验与接线。
2. 在 `src/main/index.ts` 的 `createWindow` 中调用 `register<Xxx>Ipc(window)`（需要窗口对象时传入；纯数据操作可不传）。
3. 在 `src/preload/index.ts` 通过 `contextBridge` 将方法暴露到 `window.artifactSync`，**只暴露类型化白名单方法，不透传 `ipcRenderer` 本身**。

## 强制约定

- `window.artifactSync` 是渲染层访问主进程的唯一通道；渲染层禁止直接 `import { ipcRenderer }`。
- 路径别名：主进程 `@main/*`，共享类型 `@shared/*`。跨进程共享的类型放 `src/shared/`。
- IPC handler 返回 Promise 结果；渲染层调用处使用与 preload 对应的类型签名。
- 遵循 AGENTS.md：不保留向后兼容、选择最简单实现。

## 步骤

1. 创建 `src/main/ipc/<模块>.ts`（或扩展现有文件）并注册 `domain:action` 通道。
2. 在 `src/main/index.ts` 接线。
3. 在 `src/preload/index.ts` 暴露对应方法。
4. 完成后运行 `/verify`（文档校验 + typecheck + build）确认无回归。
