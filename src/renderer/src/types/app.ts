export interface NotificationSettings {
  system: boolean;
  inApp: boolean;
}

export interface AppSettings {
  operatorName: string;
  recentProjectId: string | null;
  role: "developer" | "tester";
  notifications: NotificationSettings;
}

export interface ProjectGroup {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  groupId: string | null;
  remoteDirectory: string;
  uploadLocalPath: string;
  downloadLocalPath: string;
  uploadRules: string;
  downloadRules: string;
  createdAt: string;
  updatedAt: string;
  currentDownloadedVersion?: string;
}

export interface AppState {
  settings: AppSettings;
  groups: ProjectGroup[];
  projects: ProjectConfig[];
}

import type {
  VersionInfo as SharedVersionInfo,
  VersionSummary as SharedVersionSummary,
} from "@shared/types";

export type VersionInfo = SharedVersionInfo;
export type VersionSummary = SharedVersionSummary;

export interface ProjectDetail extends ProjectConfig {
  versions: VersionInfo[];
}

/** Draft form data matching ProjectConfig minus auto-generated fields. */
export type ProjectDraft = Omit<ProjectConfig, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  newGroupName?: string;
};

export interface ScannedFile {
  relativePath: string;
  size: number;
}

export interface ScanResult {
  files: ScannedFile[];
  ignoredFiles: ScannedFile[];
}

export interface UploadProgress {
  phase: "scanning" | "transferring" | "completed" | "error" | "cancelled";
  current: number;
  total: number;
  currentFile?: string;
  error?: string;
  errorCode?: string;
}

export interface UploadOptions {
  remoteDirectory: string;
  localPath: string;
  version: string;
  rules: string;
  description?: string;
  projectName?: string;
}

export interface UploadCompletedEvent {
  projectName: string;
  version: string;
  remoteDirectory: string;
}

export interface VersionDeletedEvent {
  projectName: string;
  version: string;
  remoteDirectory: string;
}

export interface BatchDeletedEvent {
  projectName: string;
  succeeded: string[];
  failed: string[];
  remoteDirectory: string;
}

export interface DeleteVersionResult {
  version: string;
  success: boolean;
  error?: string;
}

export interface DownloadProgress {
  phase: "scanning" | "transferring" | "completed" | "error" | "cancelled";
  current: number;
  total: number;
  currentFile?: string;
  error?: string;
  errorCode?: string;
  warnMessage?: string;
}

export interface DownloadOptions {
  remoteDirectory: string;
  localPath: string;
  version: string;
  rules: string;
  mode: "overwrite" | "clear";
}
