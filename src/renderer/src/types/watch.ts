export interface RemoteChangeEvent {
  type: "version-added" | "version-deleted";
  version: string;
  remoteDirectory: string;
  projectIds: string[];
  projectNames: string[];
}
