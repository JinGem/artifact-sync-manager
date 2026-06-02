<template>
  <el-dialog
    v-model="visible"
    width="860px"
    :destroyOnClose="true"
    class="upload-dialog"
    @closed="handleClosed"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-900/40">
          <el-icon :size="18" color="#67e8f9"><Upload /></el-icon>
        </div>
        <span class="text-lg font-semibold text-white">上传新版本</span>
      </div>
    </template>

    <!-- 表单区域（非上传中） -->
    <div v-if="!uploading" class="space-y-3">
      <div class="flex flex-row gap-3">
        <!-- 版本号自动递进（单列） -->
        <div class="grow rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-400">版本号</p>
            <span class="text-lg font-semibold text-cyan-300 font-mono tracking-tight">
              {{ computedVersion }}
            </span>
          </div>

          <div class="flex gap-3 flex-col">
            <div class="flex grow gap-3 flex-row">
              <label
                class="flex grow cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition"
                :class="
                  changeType === 'minor'
                    ? 'border-cyan-300/50 bg-cyan-950/30'
                    : 'border-white/10 bg-slate-950/35 hover:border-white/20'
                "
              >
                <el-radio v-model="changeType" label="minor" />
                <p class="text-sm font-medium text-white">新增</p>
              </label>
              <label
                class="flex grow cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition"
                :class="
                  changeType === 'patch'
                    ? 'border-cyan-300/50 bg-cyan-950/30'
                    : 'border-white/10 bg-slate-950/35 hover:border-white/20'
                "
              >
                <el-radio v-model="changeType" label="patch" />
                <p class="text-sm font-medium text-white">修复</p>
              </label>
            </div>
            <label
              class="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition"
              :class="
                hasBreakingChange
                  ? 'border-red-400/40 bg-red-950/20'
                  : 'border-white/10 bg-slate-950/35 hover:border-white/20'
              "
            >
              <el-checkbox v-model="hasBreakingChange" />
              <div>
                <p class="text-sm font-medium text-white">包含破坏性变动</p>
                <p class="text-xs text-slate-400 mt-0.5">勾选后将更新 major 版本号（主版本升级）</p>
              </div>
            </label>
          </div>
        </div>

        <!-- 版本说明 -->
        <div class="grow rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-sm uppercase tracking-[0.25em] text-slate-400 mb-2">版本说明</p>
          <el-input
            v-model="description"
            type="textarea"
            :rows="6"
            placeholder="可选，简要描述此版本的内容"
            :disabled="uploadStarted"
            class="custom-input"
          />
        </div>
      </div>

      <!-- 文件预览（树形） -->
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-white">文件预览</p>
          <div class="flex items-center gap-3">
            <el-button
              v-if="!scanning && scannedFiles.length > 0"
              size="small"
              text
              class="!text-slate-400 hover:!text-cyan-300"
              @click="scanLocalFiles"
            >
              重新扫描
            </el-button>
            <span v-if="scannedFiles.length > 0" class="text-sm text-slate-500">
              {{ scannedFiles.length }} 个文件 · {{ formatSize(totalSize) }}
            </span>
            <span v-else-if="!scanning" class="text-sm text-slate-500">无匹配文件</span>
          </div>
        </div>
        <div v-if="scanning" class="flex items-center justify-center py-4 text-slate-400">
          <el-icon :size="20" class="mr-2"><Loading /></el-icon>
          <span class="text-sm">正在扫描文件...</span>
        </div>
        <div v-else-if="scannedFiles.length > 0" class="file-tree-wrapper max-h-56 overflow-y-auto">
          <el-tree
            :data="fileTree"
            :props="{ children: 'children', label: 'label' }"
            nodeKey="id"
            :defaultExpandAll="true"
            :indent="16"
            :expandOnClickNode="true"
            class="file-tree"
          >
            <template #default="{ node, data }">
              <span class="inline-flex items-center gap-2 w-full text-sm">
                <el-icon :size="16" class="shrink-0" :color="data.isFile ? '#64748b' : '#67e8f9'">
                  <Document v-if="data.isFile" />
                  <FolderOpened v-else-if="node.expanded" />
                  <Folder v-else />
                </el-icon>
                <span class="text-slate-300 truncate">{{ data.label }}</span>
                <span v-if="data.isFile" class="ml-auto shrink-0 text-xs text-slate-500">{{
                  formatSize(data.size)
                }}</span>
                <span v-else class="ml-auto shrink-0 text-xs text-slate-500"
                  >{{ data.children.length }} 项 · {{ formatSize(data.size) }}</span
                >
              </span>
            </template>
          </el-tree>
        </div>

        <!-- 已忽略文件 -->
        <div v-if="ignoredFiles.length > 0" class="mt-2">
          <button
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/5 transition-colors"
            @click="showIgnored = !showIgnored"
          >
            <el-icon :size="14" :class="{ 'rotate-90': showIgnored }" class="transition-transform"
              ><ArrowRight
            /></el-icon>
            已忽略 {{ ignoredFiles.length }} 个文件/目录
          </button>
          <div v-show="showIgnored" class="mt-1 space-y-0.5 max-h-28 overflow-y-auto pl-6">
            <div
              v-for="file in ignoredFiles"
              :key="file.relativePath"
              class="flex items-center justify-between rounded px-2.5 py-1 text-xs"
            >
              <span class="truncate text-slate-500">{{ file.relativePath }}</span>
              <span class="ml-2 shrink-0 text-slate-600">{{
                file.size > 0 ? formatSize(file.size) : "—"
              }}</span>
            </div>
          </div>
        </div>
        <div
          v-else-if="scanError"
          class="flex items-center justify-center py-4 text-red-400 text-sm"
        >
          <el-icon :size="16" class="mr-1.5"><CircleCloseFilled /></el-icon>
          {{ scanError }}
        </div>
        <div v-else class="flex items-center justify-center py-4 text-slate-500 text-sm">
          {{ props.localPath ? "未扫描到匹配的文件，请检查上传规则" : "请先配置上传本地路径" }}
        </div>
      </div>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading" class="space-y-6 py-2">
      <div class="flex flex-col items-center gap-3 py-6">
        <el-icon :size="40" :color="progressIconColor">
          <UploadFilled v-if="progressPhase === 'transferring'" />
          <CircleCheckFilled v-else-if="progressPhase === 'completed'" />
          <CircleCloseFilled
            v-else-if="progressPhase === 'error' || progressPhase === 'cancelled'"
          />
          <Loading v-else />
        </el-icon>
        <p class="text-lg font-medium text-white">{{ progressText }}</p>
        <p v-if="currentFile" class="text-sm text-slate-400 truncate max-w-full px-8">
          {{ currentFile }}
        </p>
      </div>

      <el-progress
        :percentage="progressPercent"
        :status="progressStatus"
        :stroke-width="20"
        :textInside="true"
        class="!px-2"
      />

      <div class="text-center text-sm text-slate-500">
        {{ progressCurrent }} / {{ progressTotal }}
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <el-button
          v-if="!uploadStarted"
          plain
          class="!border-white/10 !text-slate-300 hover:!bg-white/5"
          @click="handleClose"
        >
          取消
        </el-button>
        <el-button
          v-if="!uploadStarted"
          type="primary"
          :loading="scanning"
          :disabled="!props.localPath || !!scanError"
          class="!rounded-xl !px-6"
          @click="handleStartUpload"
        >
          {{ scanning ? "扫描中..." : "开始上传" }}
        </el-button>

        <el-button
          v-if="uploadStarted"
          plain
          class="!border-red-400/40 !text-red-300 hover:!bg-red-950/30"
          @click="handleCancel"
        >
          取消上传
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, ElNotification } from "element-plus";
import {
  Upload,
  UploadFilled,
  CircleCheckFilled,
  CircleCloseFilled,
  Loading,
  Folder,
  FolderOpened,
  Document,
  ArrowRight,
} from "@element-plus/icons-vue";

import type { ScannedFile, VersionInfo } from "@renderer/types/app";
import { useTaskStore } from "@renderer/stores/taskStore";

const props = defineProps<{
  localPath: string;
  remoteDirectory: string;
  rules: string;
  existingVersions: VersionInfo[];
  projectName: string;
}>();

const emit = defineEmits<{
  done: [];
}>();

const api = window.artifactSync;
const visible = defineModel<boolean>("visible", { required: true });
const taskStore = useTaskStore();

const description = ref("");
const scanning = ref(false);
const scanError = ref("");
const scannedFiles = ref<ScannedFile[]>([]);
const ignoredFiles = ref<ScannedFile[]>([]);
const showIgnored = ref(false);
const uploading = ref(false);
const uploadStarted = ref(false);
const changeType = ref<"minor" | "patch">("patch");
const hasBreakingChange = ref(false);

const progressCurrent = ref(0);
const progressTotal = ref(0);
const currentFile = ref("");
const progressPhase = ref<string>("");

interface FileTreeNode {
  id: string;
  label: string;
  isFile: boolean;
  size: number;
  children: FileTreeNode[];
}

const totalSize = computed(() => scannedFiles.value.reduce((sum, f) => sum + f.size, 0));

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

const progressPercent = computed(() => {
  if (progressTotal.value === 0) return 0;
  return Math.round((progressCurrent.value / progressTotal.value) * 100);
});

const progressStatus = computed(() => {
  if (progressPhase.value === "error") return "exception";
  if (progressPhase.value === "completed") return "success";
  return "";
});

const progressIconColor = computed(() => {
  if (progressPhase.value === "error" || progressPhase.value === "cancelled") return "#f87171";
  if (progressPhase.value === "completed") return "#34d399";
  return "#67e8f9";
});

const progressText = computed(() => {
  switch (progressPhase.value) {
    case "scanning":
      return "正在扫描文件...";
    case "transferring":
      return "正在上传...";
    case "completed":
      return "上传完成！";
    case "error":
      return "上传失败";
    case "cancelled":
      return "上传已取消";
    default:
      return "";
  }
});

const computedVersion = computed(() => {
  const latest = [...props.existingVersions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find(() => true);

  if (!latest) return "v1.0.0";

  const parts = latest.name.replace(/^v/i, "").split(".").map(Number);
  let [major = 0, minor = 0, patch = 0] = parts;
  major = isNaN(major) ? 0 : major;
  minor = isNaN(minor) ? 0 : minor;
  patch = isNaN(patch) ? 0 : patch;

  if (hasBreakingChange.value) {
    return `v${major + 1}.0.0`;
  }

  if (changeType.value === "minor") {
    return `v${major}.${minor + 1}.0`;
  }

  return `v${major}.${minor}.${patch + 1}`;
});

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

// Auto-scan local files when dialog opens
const scanLocalFiles = async (): Promise<void> => {
  if (!props.localPath) return;
  scanning.value = true;
  scanError.value = "";
  showIgnored.value = false;
  try {
    const result = await api.scanFiles(props.localPath, props.rules);
    scannedFiles.value = result.files;
    ignoredFiles.value = result.ignoredFiles;
  } catch (err) {
    scannedFiles.value = [];
    ignoredFiles.value = [];
    scanError.value = (err as Error).message;
    console.error("[UploadDialog] 扫描文件失败:", err);
  } finally {
    scanning.value = false;
  }
};

// --- 草稿保存 (F2) ---
const DRAFT_KEY = () => `draft:upload:${props.projectName}`;

const saveDraft = (): void => {
  const draft = {
    changeType: changeType.value,
    hasBreakingChange: hasBreakingChange.value,
    description: description.value,
  };
  try {
    localStorage.setItem(DRAFT_KEY(), JSON.stringify(draft));
  } catch {
    /* 存储满时忽略 */
  }
};

const loadDraft = (): void => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY());
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.changeType) changeType.value = draft.changeType;
    if (typeof draft.hasBreakingChange === "boolean")
      hasBreakingChange.value = draft.hasBreakingChange;
    if (typeof draft.description === "string") description.value = draft.description;
  } catch {
    /* 解析失败时忽略 */
  }
};

const clearDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY());
  } catch {
    /* 忽略 */
  }
};

watch(visible, async (val) => {
  if (val) {
    loadDraft();
    if (props.localPath) {
      await scanLocalFiles();
    }
  }
});

watch([changeType, hasBreakingChange, description], () => {
  if (visible.value) saveDraft();
});

const handleStartUpload = async (): Promise<void> => {
  if (!props.localPath) {
    ElMessage.warning("上传本地路径未配置，请先在项目设置中配置。");
    return;
  }

  scanning.value = true;
  uploadStarted.value = true;
  uploading.value = true;
  progressPhase.value = "scanning";

  const taskId = `upload_${Date.now()}`;
  const versionStr = computedVersion.value;

  taskStore.addTask({
    id: taskId,
    type: "upload",
    projectName: props.projectName,
    version: versionStr,
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
      version: versionStr,
      rules: props.rules,
      description: description.value,
      projectName: props.projectName,
    },
  });

  const cleanup = api.onUploadProgress((progress) => {
    progressPhase.value = progress.phase;
    progressCurrent.value = progress.current;
    progressTotal.value = progress.total;
    currentFile.value = progress.currentFile ?? "";

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
    await api.startUpload({
      remoteDirectory: props.remoteDirectory,
      localPath: props.localPath,
      version: versionStr,
      rules: props.rules,
      description: description.value,
      projectName: props.projectName,
    });

    clearDraft();
    taskStore.updateTask(taskId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    emit("done");
    ElNotification.success({
      title: "上传完成",
      message: `${props.projectName} · 版本 ${versionStr} 已上传`,
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
      ElMessage.info("上传已取消");
      setTimeout(() => {
        visible.value = false;
      }, 600);
    } else {
      ElNotification.error({
        title: "上传失败",
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
    scanning.value = false;
  }
};

const handleCancel = async (): Promise<void> => {
  try {
    await api.cancelUpload();
  } catch {
    // ignore
  }
};

const handleClose = (): void => {
  visible.value = false;
};

const handleClosed = (): void => {
  description.value = "";
  scannedFiles.value = [];
  ignoredFiles.value = [];
  showIgnored.value = false;
  uploading.value = false;
  uploadStarted.value = false;
  changeType.value = "patch";
  hasBreakingChange.value = false;
  progressPhase.value = "";
  progressCurrent.value = 0;
  progressTotal.value = 0;
  currentFile.value = "";
};
</script>

<style scoped>
.upload-dialog :deep(.el-dialog__body) {
  padding: 16px 24px 12px;
}

.upload-dialog :deep(.el-dialog__footer) {
  padding: 8px 24px 16px;
}

.file-tree-wrapper .el-tree {
  --el-tree-node-hover-bg-color: rgba(255, 255, 255, 0.05);
  --el-tree-node-content-height: 28px;
  background: transparent;
  color: #e2e8f0;
}

.file-tree-wrapper .el-tree-node__content {
  border-radius: 6px;
}

.file-tree-wrapper .el-tree-node__expand-icon {
  color: #64748b;
}

.file-tree-wrapper .el-tree-node__expand-icon.is-leaf {
  color: transparent;
}
</style>
