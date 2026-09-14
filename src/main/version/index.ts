import { readdir, stat, rm, readFile, lstat } from "original-fs/promises";
import { join, resolve, sep } from "node:path";

import type { VersionInfo, VersionSummary } from "@shared/types";
import { summarizeVersions } from "@shared/version-retention";

const SEMVER_REGEX = /^v\d+\.\d+\.\d+$/;

const isValidVersion = (name: string): boolean => SEMVER_REGEX.test(name);

/**
 * 安全递归删除，不跟随符号链接。
 * fs.rm({ recursive: true }) 会跟随目录内的符号链接，
 * 可能导致外部文件被误删。此函数先遍历子树，
 * 对符号链接单独删除（不跟随），再删除普通文件和空目录。
 */
const safeDelete = async (dirPath: string): Promise<void> => {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isSymbolicLink()) {
      await rm(fullPath, { force: true });
    } else if (entry.isDirectory()) {
      await safeDelete(fullPath);
      // safeDelete 已完成子树清理（含符号链接），此处用 recursive 安全
      await rm(fullPath, { recursive: true, force: true });
    } else {
      await rm(fullPath);
    }
  }
};

export const scanVersionSummary = async (remoteDirectory: string): Promise<VersionSummary> => {
  try {
    return summarizeVersions(remoteDirectory, await scanVersions(remoteDirectory));
  } catch {
    return {
      remoteDirectory,
      total: 0,
      recentCount: 0,
      expiredVersions: [],
      unknownDateCount: 0,
      latestVersion: null,
      scanFailed: true,
    };
  }
};

export const scanVersions = async (remoteDirectory: string): Promise<VersionInfo[]> => {
  let entries: string[];

  try {
    entries = await readdir(remoteDirectory, { withFileTypes: false });
  } catch {
    return [];
  }

  const results: VersionInfo[] = [];

  for (const entry of entries) {
    if (!isValidVersion(entry)) {
      continue;
    }

    const fullPath = join(remoteDirectory, entry);
    let stats;

    try {
      stats = await stat(fullPath);
    } catch {
      continue;
    }

    if (!stats.isDirectory()) {
      continue;
    }

    // 读取 .version.json 获取描述、操作者和权威上传时间
    let description = "";
    let operator = "";
    let uploadedAt: string | null = null;
    try {
      const metadataRaw = await readFile(join(fullPath, ".version.json"), "utf-8");
      const metadata = JSON.parse(metadataRaw);
      description = metadata.description ?? "";
      operator = metadata.operator ?? "";
      if (
        typeof metadata.uploadedAt === "string" &&
        Number.isFinite(Date.parse(metadata.uploadedAt))
      ) {
        uploadedAt = metadata.uploadedAt;
      }
    } catch {
      // 无元数据或格式异常时保留目录时间，自动清理不会使用无效日期
    }

    results.push({
      name: entry,
      description,
      operator,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      uploadedAt,
    });
  }

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return results;
};

export const deleteVersion = async (remoteDirectory: string, version: string): Promise<void> => {
  if (!isValidVersion(version)) {
    throw new Error(`无效的版本号格式：${version}`);
  }

  const versionPath = join(remoteDirectory, version);

  // 防止路径越界：解析真实路径后检查是否仍在远程目录范围内
  const absoluteVersionPath = resolve(versionPath);
  const absoluteBase = resolve(remoteDirectory) + sep;
  if (!absoluteVersionPath.startsWith(absoluteBase)) {
    throw new Error(`路径越权：版本路径不在远程目录范围内`);
  }

  // 检查顶层是否本身是符号链接（拒绝删除外部链接）
  const versionStat = await lstat(versionPath);
  if (versionStat.isSymbolicLink()) {
    throw new Error(`不允许删除符号链接：${version}`);
  }

  // 使用安全删除，避免递归跟随内部符号链接
  if (versionStat.isDirectory()) {
    await safeDelete(versionPath);
    // safeDelete 已完成全部内部清理，此处用 recursive 安全
    await rm(versionPath, { recursive: true, force: true });
  } else {
    await rm(versionPath);
  }
};
