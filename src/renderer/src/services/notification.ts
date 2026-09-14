import { ElNotification } from "element-plus";

type InAppNotificationOptions = NonNullable<Parameters<typeof ElNotification>[0]>;

export const showInAppNotification = async (options: InAppNotificationOptions): Promise<void> => {
  const state = await window.artifactSync.getState();
  if (!state.settings.notifications.inApp) return;
  ElNotification(options);
};
