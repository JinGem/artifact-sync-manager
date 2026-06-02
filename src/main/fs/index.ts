import { readdir, stat, mkdir, copyFile, writeFile, rm, readFile } from "original-fs/promises";
import { join, relative, basename } from "node:path";

import { compileRules, isIgnored, type IgnoreRule } from "./ignore";
import { ErrorCode } from "./../errors";

export interface ScannedFile {
  relativePath: string;
  size: number;
}

export interface TransferProgress {
  phase: "scanning" | "transferring" | "completed" | "error" | "cancelled";
  current: number;
  total: number;
  currentFile?: string;
  error?: string;
  errorCode?: string;
  warnMessage?: string;
}

type ProgressCallback = (progress: TransferProgress) => void;

interface CancelScope {
  requested: boolean;
}

let currentCancelScope: CancelScope | null = null;

export const requestCancel = (): void => {
  if (currentCancelScope) {
    currentCancelScope.requested = true;
  }
};

export const resetCancel = (): void => {
  currentCancelScope = null;
};

export const inProgressUploads = new Set<string>();
export const inProgressDeletes = new Set<string>();

const getCancelScope = (): CancelScope => {
  const scope: CancelScope = { requested: false };
  currentCancelScope = scope;
  return scope;
};

/** Shared walk logic used by both scanFiles and scanRemoteFiles.
 *  Walks directory tree, applies ignore rules, collects matching files
 *  and optionally collects ignored files for preview. */
const walkDirectory = async (
  dir: string,
  basePath: string,
  rules: IgnoreRule[],
  files: ScannedFile[],
  ignoredFiles?: ScannedFile[],
  filterEntry?: (entry: string) => boolean,
): Promise<void> => {
  let entries: string[];

  try {
    entries = await readdir(dir, { withFileTypes: false });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (filterEntry && !filterEntry(entry)) continue;

    const fullPath = join(dir, entry);
    let entryStat;

    try {
      entryStat = await stat(fullPath);
    } catch {
      continue;
    }

    const relPath = relative(basePath, fullPath).replace(/\\/g, "/");

    if (entryStat.isDirectory() && !entry.endsWith(".asar")) {
      if (!isIgnored(relPath + "/", true, rules)) {
        await walkDirectory(fullPath, basePath, rules, files, ignoredFiles, filterEntry);
      } else if (ignoredFiles) {
        ignoredFiles.push({ relativePath: relPath + "/", size: 0 });
      }
    } else if (entryStat.isDirectory()) {
      // .asar is treated as a regular file, not a directory
      if (!isIgnored(relPath, false, rules)) {
        files.push({ relativePath: relPath, size: entryStat.size });
      } else if (ignoredFiles) {
        ignoredFiles.push({ relativePath: relPath, size: entryStat.size });
      }
    } else {
      if (!isIgnored(relPath, false, rules)) {
        files.push({ relativePath: relPath, size: entryStat.size });
      } else if (ignoredFiles) {
        ignoredFiles.push({ relativePath: relPath, size: entryStat.size });
      }
    }
  }
};

// --- scanFiles ------------------------------------------------------------

export interface ScanResult {
  files: ScannedFile[];
  ignoredFiles: ScannedFile[];
}

export const scanFiles = async (localPath: string, rulesText: string): Promise<ScanResult> => {
  // 检查目录是否存在且可访问
  let dirStat;
  try {
    dirStat = await stat(localPath);
  } catch {
    throw new Error(`目录不可达: ${localPath}`);
  }
  if (!dirStat.isDirectory()) {
    throw new Error(`路径不是目录: ${localPath}`);
  }

  const rules = compileRules(rulesText);
  const files: ScannedFile[] = [];
  const ignoredFiles: ScannedFile[] = [];

  await walkDirectory(localPath, localPath, rules, files, ignoredFiles);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  ignoredFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return { files, ignoredFiles };
};

// --- scanRemoteFiles ------------------------------------------------------

export const scanRemoteFiles = async (
  versionDir: string,
  rulesText: string,
): Promise<ScannedFile[]> => {
  const rules = compileRules(rulesText);
  const files: ScannedFile[] = [];

  await walkDirectory(
    versionDir,
    versionDir,
    rules,
    files,
    undefined,
    (entry) => entry !== ".version.json",
  );
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return files;
};

export const uploadVersion = async (
  options: {
    remoteDirectory: string;
    localPath: string;
    version: string;
    rulesText: string;
    operatorName: string;
    description: string;
  },
  onProgress: ProgressCallback,
): Promise<void> => {
  resetCancel();
  const cancelScope = getCancelScope();

  const sourceFolderName = basename(options.localPath);
  const versionDir = join(options.remoteDirectory, options.version);
  const targetDir = join(versionDir, sourceFolderName);
  let files: ScannedFile[];

  try {
    onProgress({ phase: "scanning", current: 0, total: 0, currentFile: "正在扫描文件..." });
    const result = await scanFiles(options.localPath, options.rulesText);
    files = result.files;
  } catch (error) {
    const msg = `扫描文件失败：${(error as Error).message}`;
    onProgress({
      phase: "error",
      current: 0,
      total: 0,
      error: msg,
      errorCode: ErrorCode.SCAN_FAILED,
    });
    throw new Error(msg);
  }

  if (files.length === 0) {
    const msg = "没有找到需要上传的文件。请检查本地路径和上传规则。";
    onProgress({ phase: "error", current: 0, total: 0, error: msg, errorCode: ErrorCode.NO_FILES });
    throw new Error(msg);
  }

  try {
    await mkdir(targetDir, { recursive: true });
  } catch (error) {
    const msg = `创建版本目录失败：${(error as Error).message}`;
    onProgress({
      phase: "error",
      current: 0,
      total: 0,
      error: msg,
      errorCode: ErrorCode.DIRECTORY_CREATE_FAILED,
    });
    throw new Error(msg);
  }

  let uploadedCount = 0;
  const total = files.length;

  for (const file of files) {
    if (cancelScope.requested) {
      await rm(versionDir, { recursive: true, force: true });
      onProgress({ phase: "cancelled", current: uploadedCount, total });
      throw new Error("上传已取消");
    }

    const destPath = join(targetDir, file.relativePath);
    const destDir = join(destPath, "..");

    try {
      await mkdir(destDir, { recursive: true });
      await copyFile(join(options.localPath, file.relativePath), destPath);
      uploadedCount++;

      onProgress({
        phase: "transferring",
        current: uploadedCount,
        total,
        currentFile: file.relativePath,
      });
    } catch (error) {
      await rm(versionDir, { recursive: true, force: true });
      const msg = `上传文件失败：${file.relativePath} — ${(error as Error).message}`;
      onProgress({
        phase: "error",
        current: uploadedCount,
        total,
        error: msg,
        errorCode: ErrorCode.COPY_FAILED,
      });
      throw new Error(msg);
    }
  }

  try {
    const metadata: Record<string, unknown> = {
      version: options.version,
      operator: options.operatorName,
      uploadedAt: new Date().toISOString(),
      fileCount: files.length,
      sourceFolderName,
    };
    if (options.description) {
      metadata.description = options.description;
    }
    await writeFile(join(versionDir, ".version.json"), JSON.stringify(metadata, null, 2), "utf-8");
  } catch {
    // metadata file is optional
  }

  onProgress({ phase: "completed", current: total, total });
};

export const downloadVersion = async (
  options: {
    remoteDirectory: string;
    localPath: string;
    version: string;
    rulesText: string;
    mode: "overwrite" | "clear";
  },
  onProgress: ProgressCallback,
): Promise<void> => {
  resetCancel();
  const cancelScope = getCancelScope();

  const versionDir = join(options.remoteDirectory, options.version);

  // 读取 .version.json 获取 sourceFolderName
  let sourceFolderName: string | null = null;
  try {
    const metadataRaw = await readFile(join(versionDir, ".version.json"), "utf-8");
    const metadata = JSON.parse(metadataRaw);
    sourceFolderName = metadata.sourceFolderName ?? null;
  } catch {
    // 向后兼容
  }

  const remoteSourceDir = sourceFolderName ? join(versionDir, sourceFolderName) : versionDir;
  const targetLocalDir = sourceFolderName
    ? join(options.localPath, sourceFolderName)
    : options.localPath;

  let files: ScannedFile[];

  try {
    onProgress({ phase: "scanning", current: 0, total: 0, currentFile: "正在扫描远程文件..." });
    files = await scanRemoteFiles(remoteSourceDir, options.rulesText);
  } catch (error) {
    const msg = `扫描远程文件失败：${(error as Error).message}`;
    onProgress({
      phase: "error",
      current: 0,
      total: 0,
      error: msg,
      errorCode: ErrorCode.SCAN_FAILED,
    });
    throw new Error(msg);
  }

  if (files.length === 0) {
    const msg = "远程目录中没有找到需要下载的文件。";
    onProgress({ phase: "error", current: 0, total: 0, error: msg, errorCode: ErrorCode.NO_FILES });
    throw new Error(msg);
  }

  if (options.mode === "clear") {
    try {
      await rm(targetLocalDir, { recursive: true, force: true });
    } catch {
      // 目录不存在或删除失败，继续
    }
  }

  try {
    await mkdir(targetLocalDir, { recursive: true });
  } catch (error) {
    const msg = `创建本地目录失败：${(error as Error).message}`;
    onProgress({
      phase: "error",
      current: 0,
      total: 0,
      error: msg,
      errorCode: ErrorCode.DIRECTORY_CREATE_FAILED,
    });
    throw new Error(msg);
  }

  const total = files.length;
  let downloadedCount = 0;

  for (const file of files) {
    if (cancelScope.requested) {
      onProgress({
        phase: "cancelled",
        current: downloadedCount,
        total,
        warnMessage: "下载已取消。本地文件可能已被部分修改，请注意检查。",
      });
      throw new Error("下载已取消");
    }

    const srcPath = join(remoteSourceDir, file.relativePath);
    const destPath = join(targetLocalDir, file.relativePath);
    const destDir = join(destPath, "..");

    try {
      await mkdir(destDir, { recursive: true });
      await copyFile(srcPath, destPath);
      downloadedCount++;

      onProgress({
        phase: "transferring",
        current: downloadedCount,
        total,
        currentFile: file.relativePath,
      });
    } catch (error) {
      const msg = `下载文件失败：${file.relativePath} — ${(error as Error).message}`;
      onProgress({
        phase: "error",
        current: downloadedCount,
        total,
        error: msg,
        errorCode: ErrorCode.COPY_FAILED,
      });
      throw new Error(msg);
    }
  }

  onProgress({ phase: "completed", current: total, total });
};
