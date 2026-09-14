/** Shared type used by both main process and renderer */
export interface VersionInfo {
  name: string;
  description: string;
  operator: string;
  createdAt: string;
  updatedAt: string;
  uploadedAt: string | null;
}

export interface VersionSummary {
  remoteDirectory: string;
  total: number;
  recentCount: number;
  expiredVersions: string[];
  unknownDateCount: number;
  latestVersion: string | null;
  scanFailed: boolean;
}
