import { contextBridge, ipcRenderer } from "electron";

declare const __APP_VERSION__: string;

contextBridge.exposeInMainWorld("artifactSync", {
  appName: "版本同步助手",
  version: __APP_VERSION__,
  getState: () => ipcRenderer.invoke("config:get-state"),
  saveOperatorName: (operatorName: string) =>
    ipcRenderer.invoke("config:save-operator-name", operatorName),
  saveUserProfile: (profile: { operatorName: string; role: "developer" | "tester" }) =>
    ipcRenderer.invoke("config:save-user-profile", profile),
  saveProject: (project: unknown) => ipcRenderer.invoke("config:save-project", project),
  deleteProject: (projectId: string) => ipcRenderer.invoke("config:delete-project", projectId),
  setRecentProject: (projectId: string) =>
    ipcRenderer.invoke("config:set-recent-project", projectId),
  chooseDirectory: () => ipcRenderer.invoke("dialog:choose-directory"),
  scanVersions: (remoteDirectory: string) =>
    ipcRenderer.invoke("version:scan-versions", remoteDirectory),
  deleteVersion: (remoteDirectory: string, version: string) =>
    ipcRenderer.invoke("version:delete-version", remoteDirectory, version),
  deleteVersions: (remoteDirectory: string, versions: string[]) =>
    ipcRenderer.invoke("version:delete-versions", remoteDirectory, versions),
  scanFiles: (localPath: string, rules: string) =>
    ipcRenderer.invoke("upload:scan-files", localPath, rules),
  scanRemoteFiles: (remoteDir: string, rules: string) =>
    ipcRenderer.invoke("download:scan-remote-files", remoteDir, rules),
  startUpload: (options: unknown) => ipcRenderer.invoke("upload:start", options),
  cancelUpload: () => ipcRenderer.invoke("upload:cancel"),
  onUploadProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress);
    ipcRenderer.on("upload:progress", handler);
    return () => {
      ipcRenderer.removeListener("upload:progress", handler);
    };
  },
  startDownload: (options: unknown) => ipcRenderer.invoke("download:start", options),
  cancelDownload: () => ipcRenderer.invoke("download:cancel"),
  onDownloadProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress);
    ipcRenderer.on("download:progress", handler);
    return () => {
      ipcRenderer.removeListener("download:progress", handler);
    };
  },
  exportConfig: () => ipcRenderer.invoke("settings:export-config"),
  importConfig: () => ipcRenderer.invoke("settings:import-config"),
  resetState: () => ipcRenderer.invoke("settings:reset-state"),
  openInExplorer: (targetPath: string) => ipcRenderer.invoke("shell:open-in-explorer", targetPath),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  isWindowMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  onWindowMaximizedChange: (callback: (maximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
    ipcRenderer.on("window:maximized-changed", handler);
    return () => {
      ipcRenderer.removeListener("window:maximized-changed", handler);
    };
  },
  onRemoteChange: (callback: (events: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, events: unknown) => callback(events);
    ipcRenderer.on("watch:remote-change", handler);
    return () => {
      ipcRenderer.removeListener("watch:remote-change", handler);
    };
  },
  onUploadCompleted: (callback: (event: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, event: unknown) => callback(event);
    ipcRenderer.on("upload:completed", handler);
    return () => {
      ipcRenderer.removeListener("upload:completed", handler);
    };
  },
  onVersionDeleted: (callback: (event: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, event: unknown) => callback(event);
    ipcRenderer.on("version:deleted", handler);
    return () => {
      ipcRenderer.removeListener("version:deleted", handler);
    };
  },
  onVersionBatchDeleted: (callback: (event: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, event: unknown) => callback(event);
    ipcRenderer.on("version:batch-deleted", handler);
    return () => {
      ipcRenderer.removeListener("version:batch-deleted", handler);
    };
  },
});

export {};
