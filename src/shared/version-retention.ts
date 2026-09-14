import type { VersionInfo, VersionSummary } from "./types";

export const VERSION_RETENTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface VersionDateSource {
  name: string;
  createdAt: string;
  uploadedAt?: string | null;
}

export const getRetentionCutoff = (now = Date.now()): number => {
  return now - VERSION_RETENTION_DAYS * DAY_MS;
};

export const getVersionTimestamp = (version: VersionDateSource): number | null => {
  const timestamp = Date.parse(version.uploadedAt || version.createdAt);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const isVersionRecent = (version: VersionDateSource, now = Date.now()): boolean => {
  const timestamp = getVersionTimestamp(version);
  return timestamp !== null && timestamp >= getRetentionCutoff(now);
};

export const isVersionExpired = (version: VersionDateSource, now = Date.now()): boolean => {
  const timestamp = getVersionTimestamp(version);
  return timestamp !== null && timestamp < getRetentionCutoff(now);
};

export const compareVersionNames = (a: string, b: string): number => {
  const aParts = a.replace(/^v/i, "").split(".").map(Number);
  const bParts = b.replace(/^v/i, "").split(".").map(Number);

  for (let index = 0; index < 3; index++) {
    const difference = (aParts[index] || 0) - (bParts[index] || 0);
    if (difference !== 0) return difference;
  }

  return 0;
};

export const summarizeVersions = (
  remoteDirectory: string,
  versions: VersionInfo[],
): VersionSummary => {
  const sorted = [...versions].sort((a, b) => compareVersionNames(a.name, b.name));
  const expiredVersions = versions
    .filter((version) => isVersionExpired(version))
    .map((version) => version.name);
  const unknownDateCount = versions.filter(
    (version) => !isVersionRecent(version) && !isVersionExpired(version),
  ).length;

  return {
    remoteDirectory,
    total: versions.length,
    recentCount: versions.filter((version) => isVersionRecent(version)).length,
    expiredVersions,
    unknownDateCount,
    latestVersion: sorted.at(-1)?.name ?? null,
    scanFailed: false,
  };
};
