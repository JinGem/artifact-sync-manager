/** Shared type used by both main process and renderer */
export interface VersionInfo {
  name: string;
  description: string;
  operator: string;
  createdAt: string;
  updatedAt: string;
}
