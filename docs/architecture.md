# 架构地图 — 版本同步助手

> 本文是系统参考，描述进程模型、IPC、持久化、远程存储结构和目录职责。修改跨模块行为或公共接口前先读本文。
> 可视化版本见 [architecture-diagram.html](architecture-diagram.html)；文档预算见 [scripts/doc-budgets.json](../scripts/doc-budgets.json)。

## 进程模型

```text
┌────────────────────────────────────────────────────────────┐
│ Electron 主进程（Node）                                     │
│ 窗口与托盘 / 文件读写 / 版本扫描 / 上传下载 / 配置 / 目录监控   │
├────────────────────────────────────────────────────────────┤
│ Preload（contextBridge）                                    │
│ 白名单暴露 window.artifactSync                              │
├────────────────────────────────────────────────────────────┤
│ Vue 3 渲染进程                                              │
│ 页面 / 组件 / Pinia / 主题 / 用户交互                        │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    内网共享目录或本地磁盘
```

`src/main/index.ts` 创建无边框窗口、初始化目录监控与系统托盘并注册各领域 IPC。`src/preload/index.ts` 通过 `contextBridge.exposeInMainWorld("artifactSync", ...)` 暴露白名单方法；渲染层不加载 Node 内置模块。渲染层的页面、状态和主题细节见 [src/renderer/README.md](../src/renderer/README.md)。

## IPC

IPC 通道使用 `domain:action` 命名。主进程处理器位于 `src/main/ipc/`，覆盖 `config`、`version`、`upload`、`download`、`settings`、`shell` 和 `window`。上传与下载进度、窗口最大化状态和远程目录变化由主进程 `webContents.send()` 推送，预加载层转换为带清理函数的监听器。

## 本地状态

`src/main/config/store.ts` 的 `appStateStore` 读写 `app.getPath("userData")/config/app-state.json`。状态包含：

- `settings.operatorName`：操作者名称。
- `settings.role`：`developer` 或 `tester`。
- `settings.recentProjectId`：最近访问的项目。
- `projects`：项目 ID、名称、远程目录、本地上传/下载路径、规则、时间戳和最近下载版本。

项目名称按大小写不敏感去重，编辑项目保留原始 `createdAt`。

## 远程版本结构

远程目录直接以版本号作为一级子目录：

```text
<remoteDirectory>/
  <version>/
    .version.json
    <sourceFolderName>/
      ...
```

`src/main/fs/index.ts` 的 `uploadVersion()` 将本地源目录名保留为 `<sourceFolderName>`，并在版本根目录写入 `.version.json`，字段包括 `version`、`operator`、`uploadedAt`、`fileCount`、`sourceFolderName` 和可选 `description`。`downloadVersion()` 读取该文件恢复目标目录名；扫描与删除版本由 `src/main/version/index.ts` 处理，只接受 `vX.Y.Z` 目录。

## 任务与监控

- 上传、下载和取消由 `src/main/fs/index.ts` 执行，`src/main/ipc/*` 只负责接收参数并转发进度。
- `src/main/watch/directory-watcher.ts` 的 `watcherService` 按规范化远程目录去重。每个目录使用 30 秒轮询作为可靠路径，同时用 `fs.watch` 缩短变化响应时间；首次扫描建立版本快照基线。
- 远程变化过滤本进程正在上传或删除的版本，然后通过 Electron Notification 和 `watch:remote-change` 发送给渲染层。
- `src/main/tray/index.ts` 创建托盘菜单；窗口关闭事件隐藏窗口，`before-quit` 释放 watcher 和托盘。

## 目录职责

| 目录             | 职责                                                           | 详细文档                                              |
| ---------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| `src/main/`      | Electron 生命周期、窗口、托盘、文件操作、版本、任务、配置、IPC | 本文与对应源码                                        |
| `src/preload/`   | 白名单 IPC 桥接与上下文隔离                                    | `src/preload/index.ts`                                |
| `src/renderer/`  | 页面、组件、状态、主题与交互                                   | [src/renderer/README.md](../src/renderer/README.md)   |
| `src/shared/`    | 跨进程共享类型                                                 | `src/shared/types.ts`                                 |
| `docs/`          | 文档标准、系统地图、产品参考                                   | [docs/AGENTS.md](AGENTS.md)                           |
| `.agents/notes/` | 决策原因、备选方案与后果                                       | [.agents/notes/README.md](../.agents/notes/README.md) |

## 关键决策

- 桌面端无后端、本地 JSON 持久化：[2026-06-02-桌面端无后端与本地-json-持久化.md](../.agents/notes/implemented/architecture/2026-06-02-桌面端无后端与本地-json-持久化.md)
- Electron 三进程与 Preload 白名单桥接：[2026-06-02-electron-三进程与-preload-白名单桥接.md](../.agents/notes/implemented/architecture/2026-06-02-electron-三进程与-preload-白名单桥接.md)
- 远程版本目录与元数据布局：[2026-06-02-远程版本目录与元数据布局.md](../.agents/notes/implemented/architecture/2026-06-02-远程版本目录与元数据布局.md)
- 远程目录监控采用轮询与 `fs.watch`：[2026-06-02-远程目录监控采用轮询与-fs-watch.md](../.agents/notes/implemented/architecture/2026-06-02-远程目录监控采用轮询与-fs-watch.md)
- GitHub 风格主题令牌系统：[2026-08-08-github-风格主题令牌系统.md](../.agents/notes/implemented/architecture/2026-08-08-github-风格主题令牌系统.md)
- 文档采用渐进式披露与决策记录：[2026-09-14-文档采用渐进式披露与决策记录.md](../.agents/notes/implemented/process/2026-09-14-文档采用渐进式披露与决策记录.md)
