# Agent Note: Electron 三进程与 Preload 白名单桥接

Status: implemented

## Problem

渲染层需要读取项目配置、扫描文件、启动任务并接收进度，但这些操作依赖 Node.js、Electron 主进程和本机文件系统。把完整 Node 能力暴露给页面会扩大权限范围。

## Decision

应用按主进程、preload 和渲染进程分层。`src/main/` 负责文件系统、版本、任务、窗口、托盘和 IPC；`src/preload/index.ts` 使用 `contextBridge.exposeInMainWorld("artifactSync", ...)` 暴露方法白名单；渲染进程只调用 `window.artifactSync`。`BrowserWindow` 设置 `contextIsolation: true` 和 `nodeIntegration: false`。

## Alternatives considered

- **渲染进程开启 `nodeIntegration`**：页面可直接访问文件系统，但破坏上下文隔离。
- **直接向页面暴露整个 `ipcRenderer`**：调用方可发送任意通道，无法限制主进程能力。
- **本机 HTTP 服务**：增加端口管理、鉴权和生命周期处理，对单进程桌面应用没有收益。

## Consequences

主进程是特权操作的唯一边界，IPC 方法和共享类型需要同步维护。预加载层返回函数供渲染层清理监听器；任何新能力都必须在主进程 handler、preload 白名单和调用方三处完成。
