import { ipcMain, shell } from "electron";

export const registerShellIpc = (): void => {
  ipcMain.handle("shell:open-in-explorer", async (_event, targetPath: string) => {
    if (!targetPath || typeof targetPath !== "string") {
      throw new Error("无效的路径");
    }
    await shell.openPath(targetPath);
  });
};
