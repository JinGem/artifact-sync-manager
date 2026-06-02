import type {
  AppState,
  ProjectDraft,
  VersionInfo,
  ScannedFile,
  ScanResult,
  UploadProgress,
  UploadOptions,
  UploadCompletedEvent,
  DownloadProgress,
  DownloadOptions,
  VersionDeletedEvent,
  BatchDeletedEvent,
  DeleteVersionResult,
} from "./types/app";
import type { RemoteChangeEvent } from "./types/watch";

/// <reference types="vite/client" />

declare global {
  interface Window {
    artifactSync: {
      appName: string;
      version: string;
      getState: () => Promise<AppState>;
      saveOperatorName: (operatorName: string) => Promise<AppState>;
      saveUserProfile: (profile: {
        operatorName: string;
        role: "developer" | "tester";
      }) => Promise<AppState>;
      saveProject: (project: ProjectDraft) => Promise<AppState>;
      deleteProject: (projectId: string) => Promise<AppState>;
      setRecentProject: (projectId: string) => Promise<AppState>;
      chooseDirectory: () => Promise<string | null>;
      scanVersions: (remoteDirectory: string) => Promise<VersionInfo[]>;
      deleteVersion: (remoteDirectory: string, version: string) => Promise<void>;
      deleteVersions: (
        remoteDirectory: string,
        versions: string[],
      ) => Promise<DeleteVersionResult[]>;
      scanFiles: (localPath: string, rules: string) => Promise<ScanResult>;
      scanRemoteFiles: (remoteDir: string, rules: string) => Promise<ScannedFile[]>;
      startUpload: (options: UploadOptions) => Promise<void>;
      cancelUpload: () => Promise<void>;
      onUploadProgress: (callback: (progress: UploadProgress) => void) => () => void;
      startDownload: (options: DownloadOptions) => Promise<void>;
      cancelDownload: () => Promise<void>;
      onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
      openInExplorer: (targetPath: string) => Promise<void>;
      exportConfig: () => Promise<string | null>;
      importConfig: () => Promise<{
        created: number;
        skipped: number;
        error: number;
        state: AppState;
      } | null>;
      resetState: () => Promise<AppState>;
      onRemoteChange: (callback: (events: RemoteChangeEvent[]) => void) => () => void;
      onUploadCompleted: (callback: (event: UploadCompletedEvent) => void) => () => void;
      onVersionDeleted: (callback: (event: VersionDeletedEvent) => void) => () => void;
      onVersionBatchDeleted: (callback: (event: BatchDeletedEvent) => void) => () => void;
    };
  }
}

export {};
