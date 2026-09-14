import { ipcMain, type BrowserWindow } from "electron";
import { setTimeout } from "node:timers";

import { scanVersions, scanVersionSummary, deleteVersion } from "@main/version/index";
import { inProgressDeletes } from "@main/fs/index";
import { appStateStore } from "@main/config/store";
import { showSystemNotification } from "@main/notification";

const assertDeveloperRole = async (): Promise<void> => {
  const state = await appStateStore.getState();
  if (state.settings.role === "tester") {
    throw new Error("测试角色无权删除版本");
  }
};

/**
 * Delay removal from inProgressDeletes so the async directory watcher
 * (fs.watch / polling) has time to fire and filter out self-triggered events,
 * preventing duplicate "版本已删除" notifications from watch:remote-change.
 */
const delayCleanup = (key: string): void => {
  setTimeout(() => inProgressDeletes.delete(key), 5_000);
};

export const registerVersionIpc = (window: BrowserWindow): void => {
  ipcMain.handle("version:scan-versions", async (_event, remoteDirectory: string) => {
    return scanVersions(remoteDirectory);
  });

  ipcMain.handle("version:scan-summaries", async (_event, remoteDirectories: string[]) => {
    const directories = [...new Set(remoteDirectories.filter(Boolean))];
    const results = new Array(directories.length);
    let cursor = 0;

    const workers = Array.from({ length: Math.min(3, directories.length) }, async () => {
      while (cursor < directories.length) {
        const index = cursor++;
        results[index] = await scanVersionSummary(directories[index]);
      }
    });

    await Promise.all(workers);
    return results;
  });

  ipcMain.handle(
    "version:delete-version",
    async (_event, remoteDirectory: string, version: string) => {
      await assertDeveloperRole();

      const deleteKey = `${remoteDirectory}/${version}`;
      inProgressDeletes.add(deleteKey);

      try {
        await deleteVersion(remoteDirectory, version);

        // Deletion fully completed — fire notifications now
        delayCleanup(deleteKey);

        // Look up project name from store
        const state = await appStateStore.getState();
        const project = state.projects.find((p) => p.remoteDirectory === remoteDirectory);
        const projectName = project?.name || "unknown";

        await showSystemNotification("版本已删除", `${projectName} · 版本 ${version} 已删除`);

        if (!window.isDestroyed()) {
          window.webContents.send("version:deleted", {
            projectName,
            version,
            remoteDirectory,
          });
        }
      } catch (error) {
        inProgressDeletes.delete(deleteKey);
        throw error;
      }
    },
  );

  ipcMain.handle(
    "version:delete-versions",
    async (_event, remoteDirectory: string, versions: string[]) => {
      await assertDeveloperRole();

      const results: { version: string; success: boolean; error?: string }[] = [];

      for (const version of versions) {
        const deleteKey = `${remoteDirectory}/${version}`;
        inProgressDeletes.add(deleteKey);
        try {
          await deleteVersion(remoteDirectory, version);
          delayCleanup(deleteKey);
          results.push({ version, success: true });
        } catch (error) {
          inProgressDeletes.delete(deleteKey);
          results.push({ version, success: false, error: (error as Error).message });
        }
      }

      // Batch completed — fire notifications
      const succeeded = results.filter((r) => r.success).map((r) => r.version);
      const failed = results.filter((r) => !r.success).map((r) => r.version);

      if (succeeded.length > 0) {
        const state = await appStateStore.getState();
        const project = state.projects.find((p) => p.remoteDirectory === remoteDirectory);
        const projectName = project?.name || "unknown";

        await showSystemNotification(
          "版本批量删除完成",
          `${projectName} · 成功删除 ${succeeded.length} 个版本${failed.length > 0 ? `，${failed.length} 个失败` : ""}`,
        );

        if (!window.isDestroyed()) {
          window.webContents.send("version:batch-deleted", {
            projectName,
            succeeded,
            failed,
            remoteDirectory,
          });
        }
      }

      return results;
    },
  );
};
