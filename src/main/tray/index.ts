import { app, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";

function findIconPath(): string {
  // Production (extraResources)
  const prod = join(process.resourcesPath, "tray-icon.png");
  if (existsSync(prod)) return prod;
  // Dev (electron-vite out/main/)
  const dev = join(__dirname, "tray-icon.png");
  if (existsSync(dev)) return dev;
  // Another dev scenario (source path)
  const src = join(__dirname, "../../src/main/tray/tray-icon.png");
  if (existsSync(src)) return src;

  return prod; // will be used as fallback
}

function createTrayIcon(): Electron.NativeImage {
  const iconPath = findIconPath();

  if (existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }

  // Fallback: raw blue circle bitmap (32x32)
  const size = 32;
  const buffer = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = size / 2;
      const cy = size / 2;
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const idx = (y * size + x) * 4;
      if (dx * dx + dy * dy <= (size / 2 - 1.5) ** 2) {
        buffer[idx] = 243; // B
        buffer[idx + 1] = 150; // G
        buffer[idx + 2] = 33; // R
        buffer[idx + 3] = 255; // A
      } else {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

export function createTray(window: BrowserWindow): Tray {
  const tray = new Tray(createTrayIcon());
  tray.setToolTip("Artifact Sync Manager");

  tray.on("click", () => {
    if (window.isMinimized()) window.restore();
    if (!window.isVisible()) window.show();
    window.focus();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示窗口",
      click: () => {
        if (window.isMinimized()) window.restore();
        window.show();
        window.focus();
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  return tray;
}
