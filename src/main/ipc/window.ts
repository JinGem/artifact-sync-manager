import { BrowserWindow, ipcMain } from "electron";

/**
 * 无边框窗口控制 IPC：
 * 最小化 / 最大化切换 / 关闭（触发托盘隐藏）/ 最大化状态查询与推送
 */
export const registerWindowIpc = (window: BrowserWindow): void => {
  ipcMain.handle("window:minimize", () => {
    window.minimize();
  });

  ipcMain.handle("window:toggle-maximize", () => {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  // 关闭窗口（沿用现有行为：非退出时隐藏到托盘）
  ipcMain.handle("window:close", () => {
    window.close();
  });

  ipcMain.handle("window:is-maximized", () => window.isMaximized());

  const sendMaximizedState = (): void => {
    if (!window.isDestroyed()) {
      window.webContents.send("window:maximized-changed", window.isMaximized());
    }
  };

  window.on("maximize", sendMaximizedState);
  window.on("unmaximize", sendMaximizedState);
};
