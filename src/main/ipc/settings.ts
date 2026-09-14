import { dialog, ipcMain, type BrowserWindow } from "electron";
import { readFile, writeFile } from "node:fs/promises";

import { appStateStore } from "@main/config/store";

export const registerSettingsIpc = (window: BrowserWindow): void => {
  ipcMain.handle("settings:reset-state", async () => appStateStore.resetState());

  ipcMain.handle("settings:import-config", async () => {
    const result = await dialog.showOpenDialog(window, {
      title: "导入配置",
      filters: [{ name: "JSON 配置文件", extensions: ["json"] }],
      properties: ["openFile"],
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    const content = await readFile(result.filePaths[0], "utf-8");
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("配置文件格式无效。");
    }

    return appStateStore.importState(parsed);
  });

  ipcMain.handle("settings:export-config", async () => {
    const result = await dialog.showSaveDialog(window, {
      title: "导出配置",
      defaultPath: "artifact-sync-config.json",
      filters: [{ name: "JSON 配置文件", extensions: ["json"] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const state = await appStateStore.getState();
    // Export only projects; operator name is local preference, not shared
    const exportData = { groups: state.groups, projects: state.projects };
    await writeFile(result.filePath, JSON.stringify(exportData, null, 2), "utf-8");
    return result.filePath;
  });
};
