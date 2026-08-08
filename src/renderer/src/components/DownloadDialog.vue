<template>
  <el-dialog
    v-model="visible"
    width="620px"
    :destroyOnClose="true"
    class="download-dialog"
    @closed="handleClosed"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft">
          <el-icon :size="18" color="var(--as-accent)"><Download /></el-icon>
        </div>
        <span class="text-lg font-semibold text-fg">下载版本</span>
        <el-tag v-if="!showingConfirm" size="small" type="info" effect="plain">
          {{ versionName }}
        </el-tag>
      </div>
    </template>

    <!-- 阶段1：主版本确认区（内嵌，仅 vX.0.0 显示） -->
    <div v-if="showingConfirm" class="space-y-5">
      <!-- 警告横幅 -->
      <div class="rounded-lg border border-warning-line bg-warning-soft p-4">
        <div class="flex items-start gap-3">
          <el-icon :size="20" color="var(--as-warning)" class="mt-0.5 shrink-0">
            <WarningFilled />
          </el-icon>
          <div>
            <p class="text-sm font-medium text-fg">主版本更新确认</p>
            <p class="mt-1 text-xs text-warning">
              此版本为主版本更新（<el-tag size="small" type="warning" effect="plain">{{
                versionName
              }}</el-tag
              >）， 下载后可能需要手动执行额外操作。
            </p>
          </div>
        </div>
      </div>

      <!-- 版本说明 -->
      <div class="rounded-lg border border-line bg-canvas p-5">
        <p class="mb-3 text-sm font-medium text-fg">版本说明</p>
        <div v-if="loadingDesc" class="flex items-center justify-center py-4 text-muted">
          <el-icon :size="18" class="mr-2"><Loading /></el-icon>
          <span class="text-sm">正在加载版本说明...</span>
        </div>
        <div
          v-else-if="confirmDescription"
          class="major-desc-box max-h-48 overflow-y-auto rounded-md border border-accent-line bg-accent-soft p-4 text-sm leading-relaxed whitespace-pre-wrap text-fg-2"
        >
          {{ confirmDescription }}
        </div>
        <div v-else class="flex flex-col items-center gap-3 py-4">
          <p class="text-sm text-warning">版本说明数据为空</p>
          <p class="text-center text-xs text-muted">可能因网络或远程目录异常导致，可尝试重新扫描</p>
          <el-button class="mt-1" @click="reloadDescription" :loading="loadingDesc">
            <el-icon :size="14" class="mr-1"><Refresh /></el-icon>
            重新扫描版本信息
          </el-button>
        </div>
      </div>

      <!-- 确认复选框 -->
      <label
        class="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-page px-4 py-3 transition hover:border-line-strong"
      >
        <el-checkbox v-model="majorConfirmed" size="large" />
        <span class="text-sm text-muted">我已知晓，此版本可能需要执行额外操作</span>
      </label>
    </div>

    <!-- 阶段2：正常下载设置（主版本确认后，或非主版本直接进入） -->
    <div v-else-if="!downloading" class="space-y-5">
      <!-- 版本与目录信息 -->
      <div class="space-y-3 rounded-lg border border-line bg-canvas p-5">
        <div class="flex items-center justify-between rounded-md bg-page px-4 py-3">
          <span class="text-sm text-muted">目标目录</span>
          <span class="ml-4 max-w-[360px] truncate text-sm text-fg-2">{{ localPath }}</span>
        </div>
        <div class="flex items-center justify-between rounded-md bg-page px-4 py-3">
          <span class="text-sm text-muted">文件规则</span>
          <span class="text-sm text-fg-2">{{ rules ? "已配置" : "无规则" }}</span>
        </div>
      </div>

      <!-- 冲突策略 -->
      <div class="rounded-lg border border-line bg-canvas p-5">
        <p class="mb-4 text-sm text-muted">目标目录处理方式</p>
        <div class="grid gap-3">
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition"
            :class="
              mode === 'overwrite'
                ? 'border-accent-line bg-accent-soft'
                : 'border-line bg-page hover:border-line-strong'
            "
          >
            <el-radio v-model="mode" label="overwrite" size="large" />
            <div>
              <p class="text-sm font-medium text-fg">覆盖已有文件</p>
              <p class="mt-0.5 text-sm text-muted">同名文件将被直接替换，本地多余文件保留</p>
            </div>
          </label>
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition"
            :class="
              mode === 'clear'
                ? 'border-accent-line bg-accent-soft'
                : 'border-line bg-page hover:border-line-strong'
            "
          >
            <el-radio v-model="mode" label="clear" size="large" />
            <div>
              <p class="text-sm font-medium text-fg">先清空目标目录</p>
              <p class="mt-0.5 text-sm text-muted">下载前删除目标目录全部内容，保证完全一致</p>
            </div>
          </label>
        </div>
      </div>

      <!-- 文件预览 -->
      <div class="rounded-lg border border-line bg-canvas p-5">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-medium text-fg">文件预览</p>
          <div class="flex items-center gap-2">
            <template v-if="!scanning && scannedFiles.length > 0">
              <el-button text @click="expandAll">
                <el-icon :size="14" class="mr-1"><Fold /></el-icon>
                展开全部
              </el-button>
              <el-button text @click="collapseAll">
                <el-icon :size="14" class="mr-1"><Fold /></el-icon>
                收起全部
              </el-button>
              <el-button text @click="scanRemote">重新扫描</el-button>
            </template>
            <span v-if="scannedFiles.length > 0" class="text-sm text-muted">
              {{ scannedFiles.length }} 个文件 · {{ formatSize(totalSize) }}
            </span>
            <span v-else-if="!scanning" class="text-sm text-muted">无匹配文件</span>
          </div>
        </div>
        <div v-if="scanning" class="flex items-center justify-center py-6 text-muted">
          <el-icon :size="20" class="mr-2"><Loading /></el-icon>
          <span class="text-sm">正在扫描远程文件...</span>
        </div>
        <div v-else-if="scannedFiles.length > 0" class="file-tree-wrapper max-h-48 overflow-y-auto">
          <el-tree
            :key="treeKey"
            :data="fileTree"
            :props="{ children: 'children', label: 'label' }"
            nodeKey="id"
            :indent="16"
            :expandOnClickNode="true"
            :defaultExpandedKeys="expandedKeys"
            class="file-tree"
          >
            <template #default="{ node, data }">
              <span class="inline-flex w-full items-center gap-2 text-sm">
                <el-icon
                  :size="16"
                  class="shrink-0"
                  :color="data.isFile ? 'var(--as-subtle)' : 'var(--as-accent)'"
                >
                  <Document v-if="data.isFile" />
                  <FolderOpened v-else-if="node.expanded" />
                  <Folder v-else />
                </el-icon>
                <span class="truncate text-fg-2">{{ data.label }}</span>
                <span v-if="data.isFile" class="ml-auto shrink-0 text-xs text-muted">{{
                  formatSize(data.size)
                }}</span>
                <span v-else class="ml-auto shrink-0 text-xs text-muted"
                  >{{ data.children.length }} 项 · {{ formatSize(data.size) }}</span
                >
              </span>
            </template>
          </el-tree>
        </div>
        <div
          v-else-if="scanError"
          class="flex items-center justify-center py-6 text-sm text-danger"
        >
          <el-icon :size="16" class="mr-1.5"><CircleCloseFilled /></el-icon>
          {{ scanError }}
        </div>
        <div v-else class="flex items-center justify-center py-6 text-sm text-muted">
          {{ props.remoteDirectory ? "未扫描到匹配的文件，请检查下载规则" : "请先配置远程目录" }}
        </div>
      </div>
    </div>

    <!-- 下载进度 -->
    <div v-if="downloading" class="space-y-6 py-2">
      <div class="flex flex-col items-center gap-3 py-6">
        <el-icon :size="40" :color="progressIconColor">
          <Download v-if="progressPhase === 'transferring'" />
          <CircleCheckFilled v-else-if="progressPhase === 'completed'" />
          <CircleCloseFilled
            v-else-if="progressPhase === 'error' || progressPhase === 'cancelled'"
          />
          <Loading v-else />
        </el-icon>
        <p class="text-lg font-medium text-fg">{{ progressText }}</p>
        <p v-if="currentFile" class="max-w-full truncate px-8 text-sm text-muted">
          {{ currentFile }}
        </p>
        <p v-if="warnMessage" class="mt-1 text-sm text-warning">
          {{ warnMessage }}
        </p>
      </div>

      <el-progress
        :percentage="progressPercent"
        :status="progressStatus"
        :stroke-width="20"
        :textInside="true"
      />

      <div class="text-center text-xs text-muted">{{ progressCurrent }} / {{ progressTotal }}</div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <!-- 主版本确认阶段 -->
        <template v-if="showingConfirm">
          <el-button plain @click="handleClose">取消</el-button>
          <el-button
            type="primary"
            :disabled="!majorConfirmed || loadingDesc"
            @click="handleConfirmMajor"
          >
            我已知晓，开始下载
          </el-button>
        </template>

        <!-- 正常下载阶段 -->
        <template v-else-if="!started">
          <el-button plain @click="handleClose">取消</el-button>
          <el-button type="primary" :disabled="!localPath" @click="handleStartDownload">
            开始下载
          </el-button>
        </template>

        <!-- 下载进行中 -->
        <el-button v-if="started" type="danger" plain @click="handleCancel"> 取消下载 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, ElNotification } from "element-plus";
import {
  Download,
  CircleCheckFilled,
  CircleCloseFilled,
  Loading,
  Fold,
  Folder,
  FolderOpened,
  Document,
  WarningFilled,
  Refresh,
} from "@element-plus/icons-vue";

import type { ScannedFile, DownloadProgress } from "@renderer/types/app";
import { useTaskStore } from "@renderer/stores/taskStore";

const props = defineProps<{
  versionName: string;
  localPath: string;
  remoteDirectory: string;
  rules: string;
  projectName: string;
  description?: string;
  currentDownloadedVersion?: string;
}>();

const emit = defineEmits<{
  done: [versionName: string];
}>();

const api = window.artifactSync;
const visible = defineModel<boolean>("visible", { required: true });
const taskStore = useTaskStore();

const mode = ref<"overwrite" | "clear">("overwrite");
const downloading = ref(false);
const started = ref(false);

// Major version confirm state
const showingConfirm = ref(false);
const majorConfirmed = ref(false);
const confirmDescription = ref("");
const loadingDesc = ref(false);

// File preview state
const scanning = ref(false);
const scanError = ref("");
const scannedFiles = ref<ScannedFile[]>([]);

const totalSize = computed(() => scannedFiles.value.reduce((sum, f) => sum + f.size, 0));

interface FileTreeNode {
  id: string;
  label: string;
  isFile: boolean;
  size: number;
  children: FileTreeNode[];
}

const expandedKeys = ref<string[]>([]);
const treeKey = ref(0);

const buildFileTree = (files: ScannedFile[]): FileTreeNode[] => {
  const root: FileTreeNode[] = [];
  for (const file of files) {
    const parts = file.relativePath.replace(/\\/g, "/").split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let existing = current.find((n) => n.label === part && n.isFile === isLast);
      if (!existing) {
        existing = {
          id: parts.slice(0, i + 1).join("/"),
          label: part,
          isFile: isLast,
          size: isLast ? file.size : 0,
          children: [],
        };
        current.push(existing);
      }
      if (!isLast) {
        existing.size += file.size;
        current = existing.children;
      }
    }
  }
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.label.localeCompare(b.label);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root);
  return root;
};

const fileTree = computed(() => buildFileTree(scannedFiles.value));

const getAllNodeKeys = (nodes: FileTreeNode[]): string[] => {
  const keys: string[] = [];
  for (const node of nodes) {
    if (!node.isFile) keys.push(node.id);
    keys.push(...getAllNodeKeys(node.children));
  }
  return keys;
};

const expandAll = (): void => {
  expandedKeys.value = getAllNodeKeys(fileTree.value);
  treeKey.value++;
};

const collapseAll = (): void => {
  expandedKeys.value = [];
  treeKey.value++;
};

const progressCurrent = ref(0);
const progressTotal = ref(0);
const currentFile = ref("");
const warnMessage = ref("");
const progressPhase = ref<string>("");

const progressPercent = computed(() => {
  if (progressPhase.value === "completed") return 100;
  if (progressTotal.value === 0) return 0;
  return Math.round((progressCurrent.value / progressTotal.value) * 100);
});

const progressStatus = computed(() => {
  if (progressPhase.value === "error") return "exception";
  if (progressPhase.value === "completed") return "success";
  return "";
});

const progressIconColor = computed(() => {
  if (progressPhase.value === "error" || progressPhase.value === "cancelled")
    return "var(--as-danger)";
  if (progressPhase.value === "completed") return "var(--as-success)";
  return "var(--as-accent)";
});

const progressText = computed(() => {
  switch (progressPhase.value) {
    case "scanning":
      return "正在扫描远程文件...";
    case "transferring":
      return "正在下载...";
    case "completed":
      return "下载完成！";
    case "error":
      return "下载失败";
    case "cancelled":
      return "下载已取消";
    default:
      return "";
  }
});

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

// Auto-scan remote files when dialog opens
const scanRemote = async (): Promise<void> => {
  if (!props.remoteDirectory || !props.localPath) return;
  scanning.value = true;
  scanError.value = "";
  try {
    // Scan from version directory (main process reads .version.json internally during download)
    const versionDir =
      props.remoteDirectory.replace(/\\/g, "/").replace(/\/+$/, "") + "/" + props.versionName;
    scannedFiles.value = await api.scanRemoteFiles(versionDir, props.rules);
  } catch (err) {
    scannedFiles.value = [];
    scanError.value = (err as Error).message;
  } finally {
    scanning.value = false;
  }
};

// 判断是否跨主版本下载：比较本地已下载版本与目标版本的 major 号
const isCrossMajorVersion = (): boolean => {
  if (!props.currentDownloadedVersion) return true;
  const targetMatch = props.versionName.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  const currentMatch = props.currentDownloadedVersion.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!targetMatch || !currentMatch) return false;
  return targetMatch[1] !== currentMatch[1];
};

// 加载版本说明（优先 props，兜底自行扫描）
const loadDescriptions = async (): Promise<void> => {
  if (props.description) {
    confirmDescription.value = props.description;
    return;
  }
  loadingDesc.value = true;
  try {
    const versions = await api.scanVersions(props.remoteDirectory);
    const found = versions.find((v) => v.name === props.versionName);
    confirmDescription.value = found?.description ?? "";
  } catch {
    confirmDescription.value = "";
  } finally {
    loadingDesc.value = false;
  }
};

// 重新扫描版本说明（空数据时手动触发）
const reloadDescription = async (): Promise<void> => {
  await loadDescriptions();
};

// 用户确认跨主版本后进入下载设置
const handleConfirmMajor = async (): Promise<void> => {
  showingConfirm.value = false;
  await scanRemote();
};

watch(
  visible,
  async (val) => {
    if (val && props.remoteDirectory && props.localPath) {
      if (isCrossMajorVersion()) {
        majorConfirmed.value = false;
        confirmDescription.value = "";
        showingConfirm.value = true;
        await loadDescriptions();
      } else {
        await scanRemote();
      }
    }
  },
  { immediate: true },
);

const handleStartDownload = async (): Promise<void> => {
  if (!props.localPath) {
    ElMessage.warning("下载本地路径未配置，请先在项目设置中配置。");
    return;
  }

  const taskId = `download_${Date.now()}`;

  taskStore.addTask({
    id: taskId,
    type: "download",
    projectName: props.projectName,
    version: props.versionName,
    status: "running",
    current: 0,
    total: 0,
    currentFile: "",
    errorMessage: "",
    errorCode: "",
    startedAt: new Date().toISOString(),
    completedAt: "",
    params: {
      remoteDirectory: props.remoteDirectory,
      localPath: props.localPath,
      version: props.versionName,
      rules: props.rules,
      mode: mode.value,
    },
  });

  downloading.value = true;
  started.value = true;
  progressPhase.value = "scanning";

  const cleanup = api.onDownloadProgress((progress: DownloadProgress) => {
    progressPhase.value = progress.phase;
    progressCurrent.value = progress.current;
    progressTotal.value = progress.total;
    currentFile.value = progress.currentFile ?? "";
    warnMessage.value = progress.warnMessage ?? "";

    taskStore.updateTask(taskId, {
      current: progress.current,
      total: progress.total,
      currentFile: progress.currentFile ?? "",
      errorMessage: progress.error ?? "",
      errorCode: progress.errorCode ?? "",
      status:
        progress.phase === "completed"
          ? "completed"
          : progress.phase === "error"
            ? "failed"
            : progress.phase === "cancelled"
              ? "cancelled"
              : "running",
    });
  });

  try {
    await api.startDownload({
      remoteDirectory: props.remoteDirectory,
      localPath: props.localPath,
      version: props.versionName,
      rules: props.rules,
      mode: mode.value,
    });

    // 完成态由渲染层显式收敛，避免最后一个进度事件时序导致进度不满 100%
    progressPhase.value = "completed";
    progressCurrent.value = progressTotal.value;
    taskStore.updateTask(taskId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    emit("done", props.versionName);
    ElNotification.success({
      title: "下载完成",
      message: `${props.projectName} · 版本 ${props.versionName} 已下载`,
      duration: 3000,
    });
    setTimeout(() => {
      visible.value = false;
    }, 600);
  } catch (error) {
    if (progressPhase.value === "cancelled") {
      taskStore.updateTask(taskId, {
        status: "cancelled",
        errorMessage: "",
        errorCode: "",
        completedAt: new Date().toISOString(),
      });
      ElMessage.info("下载已取消");
      setTimeout(() => {
        visible.value = false;
      }, 600);
    } else {
      ElNotification.error({
        title: "下载失败",
        message: (error as Error).message,
        duration: 0,
      });
      taskStore.updateTask(taskId, {
        status: "failed",
        errorMessage: (error as Error).message,
        errorCode: "UNKNOWN",
        completedAt: new Date().toISOString(),
      });
    }
  } finally {
    cleanup();
  }
};

const handleCancel = async (): Promise<void> => {
  try {
    await api.cancelDownload();
  } catch {
    // ignore
  }
};

const handleClose = (): void => {
  visible.value = false;
};

const handleClosed = (): void => {
  mode.value = "overwrite";
  downloading.value = false;
  started.value = false;
  scanning.value = false;
  scanError.value = "";
  scannedFiles.value = [];
  progressPhase.value = "";
  progressCurrent.value = 0;
  progressTotal.value = 0;
  currentFile.value = "";
  warnMessage.value = "";
  showingConfirm.value = false;
  majorConfirmed.value = false;
  confirmDescription.value = "";
  loadingDesc.value = false;
};
</script>

<style scoped>
.download-dialog :deep(.el-dialog__body) {
  padding: 16px 24px 12px;
}

.download-dialog :deep(.el-dialog__footer) {
  padding: 8px 24px 16px;
}

.file-tree-wrapper .el-tree {
  --el-tree-node-hover-bg-color: var(--as-canvas-2);
  --el-tree-node-content-height: 28px;
  background: transparent;
  color: var(--as-fg-2);
}

.file-tree-wrapper .el-tree-node__content {
  border-radius: 6px;
}

.file-tree-wrapper .el-tree-node__expand-icon {
  color: var(--as-muted);
}

.file-tree-wrapper .el-tree-node__expand-icon.is-leaf {
  color: transparent;
}

/* 主版本确认区 — 版本说明文本滚动条 */
.major-desc-box::-webkit-scrollbar {
  width: 4px;
}

.major-desc-box::-webkit-scrollbar-thumb {
  background: var(--as-line-strong);
  border-radius: 2px;
}
</style>
