import { app, BrowserWindow, Notification } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { registerConfigIpc } from "@main/ipc/config";
import { registerVersionIpc } from "@main/ipc/version";
import { registerUploadIpc } from "@main/ipc/upload";
import { registerDownloadIpc } from "@main/ipc/download";
import { registerSettingsIpc } from "@main/ipc/settings";
import { registerShellIpc } from "@main/ipc/shell";
import { registerWindowIpc } from "@main/ipc/window";
import { watcherService } from "@main/watch/directory-watcher";
import { appStateStore } from "@main/config/store";
import { createTray } from "@main/tray";
import { inProgressUploads, inProgressDeletes } from "@main/fs/index";

function findIconPath(): string {
  const candidates = [
    join(process.resourcesPath, "app-icon.png"),
    join(__dirname, "app-icon.png"),
    join(__dirname, "../../src/main/tray/app-icon.png"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return "";
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  let isQuitting = false;

  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  const createWindow = async (): Promise<BrowserWindow> => {
    const iconPath = findIconPath();

    const window = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 1180,
      minHeight: 760,
      title: "版本同步助手",
      frame: false,
      backgroundColor: "#ffffff",
      icon: iconPath,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    window.on("ready-to-show", () => {
      window.show();
    });

    // Close to tray instead of quitting
    window.on("close", (event) => {
      if (!isQuitting) {
        event.preventDefault();
        window.hide();
      }
    });

    registerConfigIpc(window);
    registerVersionIpc(window);
    registerUploadIpc(window);
    registerDownloadIpc(window);
    registerSettingsIpc(window);
    registerShellIpc();
    registerWindowIpc(window);

    if (process.env.ELECTRON_RENDERER_URL) {
      window.webContents.openDevTools();
      await window.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
      await window.loadFile(join(__dirname, "../renderer/index.html"));
    }

    return window;
  };

  app.whenReady().then(async () => {
    const window = await createWindow();

    // Initialize directory watcher
    watcherService.setOnChange((events) => {
      const win = BrowserWindow.getAllWindows()[0];

      // Filter out events for versions we are currently uploading/deleting ourselves
      const filteredEvents = events.filter((e) => {
        const key = `${e.remoteDirectory}/${e.version}`;
        return !inProgressUploads.has(key) && !inProgressDeletes.has(key);
      });

      for (const event of filteredEvents) {
        const title = event.type === "version-added" ? "新版本已上传" : "版本已删除";
        const body =
          event.type === "version-added"
            ? `[${event.projectNames.join(", ")}] ${event.version} 已上传到 ${event.remoteDirectory}`
            : `[${event.projectNames.join(", ")}] ${event.version} 已从 ${event.remoteDirectory} 删除`;

        try {
          new Notification({ title, body }).show();
        } catch {
          // System notification may fail in headless/sandboxed environments
        }
      }

      if (win && !win.isDestroyed()) {
        win.webContents.send("watch:remote-change", filteredEvents);
      }
    });

    // Load all projects and start watching
    const state = await appStateStore.getState();

    for (const project of state.projects) {
      watcherService.addPath(project.remoteDirectory, project.id, project.name);
    }

    watcherService.start();

    // Create system tray
    const tray = createTray(window);

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });

    // Store tray ref for cleanup
    app.on("before-quit", () => {
      isQuitting = true;
      watcherService.dispose();
      tray.destroy();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      // Keep app alive in tray for Windows/Linux
    }
  });
}
