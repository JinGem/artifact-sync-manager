import { Notification } from "electron";

import { appStateStore } from "@main/config/store";

export const showSystemNotification = async (title: string, body: string): Promise<void> => {
  const state = await appStateStore.getState();
  if (!state.settings.notifications.system) return;

  try {
    new Notification({ title, body }).show();
  } catch {
    // System notifications may be unavailable in headless or sandboxed environments.
  }
};
