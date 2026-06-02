import { ipcMain, type BrowserWindow } from "electron";

import { downloadVersion, requestCancel, scanRemoteFiles } from "@main/fs/index";

export const registerDownloadIpc = (window: BrowserWindow): void => {
  ipcMain.handle("download:scan-remote-files", async (_event, remoteDir: string, rules: string) => {
    return scanRemoteFiles(remoteDir, rules);
  });

  ipcMain.handle(
    "download:start",
    async (
      _event,
      options: {
        remoteDirectory: string;
        localPath: string;
        version: string;
        rules: string;
        mode: "overwrite" | "clear";
      },
    ) => {
      await downloadVersion(
        {
          remoteDirectory: options.remoteDirectory,
          localPath: options.localPath,
          version: options.version,
          rulesText: options.rules,
          mode: options.mode,
        },
        (progress) => {
          if (!window.isDestroyed()) {
            window.webContents.send("download:progress", progress);
          }
        },
      );
    },
  );

  ipcMain.handle("download:cancel", async () => {
    requestCancel();
  });
};
