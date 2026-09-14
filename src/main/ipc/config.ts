import { dialog, ipcMain, type BrowserWindow } from "electron";

import { appStateStore } from "@main/config/store";
import { watcherService } from "@main/watch/directory-watcher";

export const registerConfigIpc = (window: BrowserWindow): void => {
  ipcMain.handle("config:get-state", async () => appStateStore.getState());

  ipcMain.handle("config:save-operator-name", async (_event, operatorName: string) =>
    appStateStore.saveOperatorName(operatorName),
  );

  ipcMain.handle(
    "config:save-user-profile",
    async (_event, profile: { operatorName: string; role: "developer" | "tester" }) =>
      appStateStore.saveUserProfile(profile),
  );

  ipcMain.handle("config:save-notification-settings", async (_event, settings) =>
    appStateStore.saveNotificationSettings(settings),
  );

  ipcMain.handle("group:save", async (_event, group) => appStateStore.saveGroup(group));

  ipcMain.handle("group:delete", async (_event, groupId: string) =>
    appStateStore.deleteGroup(groupId),
  );

  ipcMain.handle("config:save-project", async (_event, project) => {
    const oldState = await appStateStore.getState();
    const oldProject = project.id ? oldState.projects.find((p) => p.id === project.id) : null;

    const newState = await appStateStore.saveProject(project);

    if (oldProject) {
      watcherService.removePath(oldProject.remoteDirectory, oldProject.id);
    }

    const savedProject = project.id
      ? newState.projects.find((p) => p.id === project.id)
      : newState.projects[0];

    if (savedProject) {
      watcherService.addPath(savedProject.remoteDirectory, savedProject.id, savedProject.name);
    }

    return newState;
  });

  ipcMain.handle("config:delete-project", async (_event, projectId: string) => {
    const oldState = await appStateStore.getState();
    const deletedProject = oldState.projects.find((p) => p.id === projectId);

    const newState = await appStateStore.deleteProject(projectId);

    if (deletedProject) {
      watcherService.removePath(deletedProject.remoteDirectory, projectId);
    }

    return newState;
  });

  ipcMain.handle("config:set-recent-project", async (_event, projectId: string) =>
    appStateStore.setRecentProject(projectId),
  );

  ipcMain.handle("dialog:choose-directory", async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0] ?? null;
  });
};
