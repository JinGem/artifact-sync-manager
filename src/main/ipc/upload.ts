import { ipcMain, Notification, type BrowserWindow } from "electron";
import { setTimeout } from "node:timers";

import { scanFiles, uploadVersion, requestCancel, inProgressUploads } from "@main/fs/index";
import { appStateStore } from "@main/config/store";

/**
 * Delay removal from inProgressUploads so the async directory watcher
 * has time to fire and filter out self-triggered "version-added" events.
 */
const delayCleanup = (key: string): void => {
  setTimeout(() => inProgressUploads.delete(key), 5_000);
};

export const registerUploadIpc = (window: BrowserWindow): void => {
  ipcMain.handle("upload:scan-files", async (_event, localPath: string, rules: string) => {
    return scanFiles(localPath, rules);
  });

  ipcMain.handle(
    "upload:start",
    async (
      _event,
      options: {
        remoteDirectory: string;
        localPath: string;
        version: string;
        rules: string;
        description?: string;
        projectName?: string;
      },
    ) => {
      const state = await appStateStore.getState();
      const operatorName = state.settings.operatorName || "unknown";

      const uploadKey = `${options.remoteDirectory}/${options.version}`;
      inProgressUploads.add(uploadKey);

      try {
        await uploadVersion(
          {
            remoteDirectory: options.remoteDirectory,
            localPath: options.localPath,
            version: options.version,
            rulesText: options.rules,
            operatorName,
            description: options.description ?? "",
          },
          (progress) => {
            if (!window.isDestroyed()) {
              window.webContents.send("upload:progress", progress);
            }
          },
        );

        // Upload fully completed — fire notifications now
        delayCleanup(uploadKey);

        const projectName = options.projectName || "unknown";
        try {
          new Notification({
            title: "上传完成",
            body: `${projectName} · 版本 ${options.version} 已上传`,
          }).show();
        } catch {
          // System notification may fail in headless/sandboxed environments
        }

        if (!window.isDestroyed()) {
          window.webContents.send("upload:completed", {
            projectName,
            version: options.version,
            remoteDirectory: options.remoteDirectory,
          });
        }
      } catch (error) {
        inProgressUploads.delete(uploadKey);
        throw error;
      }
    },
  );

  ipcMain.handle("upload:cancel", async () => {
    requestCancel();
  });
};
