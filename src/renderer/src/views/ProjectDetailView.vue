<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-var(--spacing)*11)] max-w-7xl flex-col gap-5 px-6 py-6 lg:px-10"
  >
    <!-- 头部 -->
    <div class="flex shrink-0 items-center gap-4">
      <el-button :icon="ArrowLeft" text @click="goBack">返回</el-button>
      <h1 class="truncate text-2xl font-semibold text-fg">
        {{ project?.name ?? "项目加载中..." }}
      </h1>
    </div>

    <!-- 项目信息 -->
    <div class="shrink-0 rounded-lg border border-line bg-page p-7 shadow-sm">
      <div class="mb-5 flex items-center justify-between">
        <span class="text-base font-semibold text-fg">项目信息</span>
        <div class="flex items-center gap-2">
          <el-button size="small" plain @click="openEditDialog"> 编辑项目 </el-button>
          <el-button
            size="small"
            type="primary"
            :icon="Upload"
            :disabled="!project?.uploadLocalPath || userRole === 'tester'"
            @click="showUploadDialog = true"
          >
            上传版本
          </el-button>
        </div>
      </div>
      <div class="grid gap-5 md:grid-cols-4">
        <div
          v-if="project?.remoteDirectory"
          class="group cursor-pointer rounded-md border border-line-soft bg-canvas px-4 py-3.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
          @click="openDir(project.remoteDirectory)"
        >
          <p class="text-xs text-subtle">远程目录</p>
          <p
            class="mt-1 break-all font-mono text-sm text-fg-2 transition-colors group-hover:text-accent"
          >
            {{ project.remoteDirectory }}
          </p>
        </div>
        <div
          v-if="project?.uploadLocalPath"
          class="group cursor-pointer rounded-md border border-line-soft bg-canvas px-4 py-3.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
          @click="openDir(project.uploadLocalPath)"
        >
          <p class="text-xs text-subtle">上传本地路径</p>
          <p
            class="mt-1 break-all font-mono text-sm text-fg-2 transition-colors group-hover:text-accent"
          >
            {{ project.uploadLocalPath }}
          </p>
        </div>
        <div
          v-if="project?.downloadLocalPath"
          class="group cursor-pointer rounded-md border border-line-soft bg-canvas px-4 py-3.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
          @click="openDir(project.downloadLocalPath)"
        >
          <p class="text-xs text-subtle">下载本地路径</p>
          <p
            class="mt-1 break-all font-mono text-sm text-fg-2 transition-colors group-hover:text-accent"
          >
            {{ project.downloadLocalPath }}
          </p>
        </div>
        <div class="rounded-md border border-line-soft bg-canvas px-4 py-3.5">
          <p class="text-xs text-subtle">创建时间</p>
          <p class="mt-1 text-sm text-fg-2">
            {{ project?.createdAt ? formatTime(project.createdAt) : "-" }}
          </p>
        </div>
      </div>
    </div>

    <!-- 版本列表 -->
    <div
      class="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-page p-7 shadow-sm"
    >
      <div class="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
        <div class="flex items-center gap-3">
          <span class="text-sm font-semibold text-fg">版本列表</span>
          <span
            class="inline-flex h-5 items-center rounded-full border border-success-line bg-success-soft px-2 text-[11px] leading-5 text-success"
          >
            {{ versions.length }} 个版本
          </span>
        </div>
        <el-button
          size="small"
          type="primary"
          :loading="loading"
          :icon="Refresh"
          @click="loadVersions"
        >
          刷新
        </el-button>
      </div>

      <!-- 浮动操作栏 -->
      <transition name="batch-bar">
        <div
          v-if="selectedVersions.length > 0 && userRole === 'developer'"
          class="mx-6 mb-3 flex items-center justify-between rounded-md border border-danger-line bg-danger-soft px-4 py-2.5"
        >
          <span class="text-sm text-fg-2">
            已选择
            <strong class="text-fg">{{ selectedVersions.length }}</strong>
            个版本
          </span>
          <div class="flex items-center gap-2">
            <el-button size="small" plain @click="clearSelection"> 取消选择 </el-button>
            <el-button
              size="small"
              type="danger"
              :loading="isBatchDeleting"
              @click="showBatchDeleteConfirm = true"
            >
              批量删除
            </el-button>
          </div>
        </div>
      </transition>

      <div class="flex min-h-0 flex-1 flex-col px-6 pb-5">
        <!-- 加载中 -->
        <div
          v-if="loading && versions.length === 0"
          class="flex flex-1 items-center justify-center gap-3"
        >
          <el-icon :size="24" color="var(--as-accent)"><Loading /></el-icon>
          <span class="text-sm text-muted">正在扫描版本...</span>
        </div>

        <!-- 空状态 -->
        <div
          v-else-if="versions.length === 0"
          class="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-canvas"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-md bg-canvas-2">
            <el-icon :size="22" color="var(--as-subtle)"><FolderOpened /></el-icon>
          </div>
          <div class="text-center">
            <p class="text-sm font-medium text-fg-2">暂无版本</p>
            <p class="mt-1 text-sm text-muted">上传首个版本后列表将在此展示</p>
          </div>
        </div>

        <!-- 版本表格 -->
        <el-table
          v-else
          ref="versionTableRef"
          :data="sortedVersions"
          stripe
          style="width: 100%"
          :rowClassName="tableRowClassName"
          rowKey="name"
          @sort-change="handleSortChange"
          @selection-change="handleSelectionChange"
          class="version-table"
        >
          <!-- 选择列 -->
          <el-table-column
            v-if="userRole === 'developer'"
            type="selection"
            width="40"
            :reserveSelection="false"
          />
          <!-- 版本号 -->
          <el-table-column prop="name" label="版本号" width="200" sortable="custom">
            <template #default="{ row }">
              <div class="flex min-w-0 items-center gap-2">
                <p class="font-mono text-sm font-semibold text-fg">
                  {{ row.name }}
                </p>
                <span
                  v-if="project?.currentDownloadedVersion === row.name"
                  class="inline-flex h-[18px] items-center rounded-full border border-success-line bg-success-soft px-1.5 text-[10px] leading-[18px] text-success"
                >
                  当前版本
                </span>
              </div>
            </template>
          </el-table-column>

          <!-- 操作者 -->
          <el-table-column prop="operator" label="操作者" width="120" sortable="custom">
            <template #default="{ row }">
              <span class="text-sm text-muted">{{ row.operator || "—" }}</span>
            </template>
          </el-table-column>

          <!-- 日期 -->
          <el-table-column prop="createdAt" label="日期" width="170" sortable="custom">
            <template #default="{ row }">
              <span class="text-sm text-muted">{{ formatTime(row.createdAt) }}</span>
            </template>
          </el-table-column>

          <!-- 版本说明 -->
          <el-table-column prop="description" label="版本说明" minWidth="180">
            <template #default="{ row }">
              <p
                v-if="row.description"
                class="max-w-90 truncate text-sm text-fg-2"
                :title="row.description"
              >
                {{ row.description }}
              </p>
              <span v-else class="text-sm text-subtle">—</span>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-button
                  type="success"
                  plain
                  size="small"
                  :disabled="!project?.downloadLocalPath"
                  @click="startDownload(row.name)"
                >
                  下载
                </el-button>
                <el-popconfirm
                  v-if="userRole === 'developer'"
                  title="删除版本将同时删除远程目录中的对应文件，确认删除吗？"
                  confirmButtonText="删除"
                  cancelButtonText="取消"
                  @confirm="handleDeleteVersion(row.name)"
                >
                  <template #reference>
                    <el-button
                      type="danger"
                      plain
                      size="small"
                      :disabled="deletingVersion === row.name"
                    >
                      {{ deletingVersion === row.name ? "删除中..." : "删除" }}
                    </el-button>
                  </template>
                </el-popconfirm>
                <span v-else class="select-none text-xs text-subtle">—</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 上传对话框 -->
    <UploadDialog
      v-if="project"
      v-model:visible="showUploadDialog"
      :localPath="project.uploadLocalPath"
      :remoteDirectory="project.remoteDirectory"
      :rules="project.uploadRules"
      :existingVersions="versions"
      :projectName="project.name"
      @done="handleUploadDone"
    />

    <!-- 下载对话框 -->
    <DownloadDialog
      v-if="project && downloadVersion"
      v-model:visible="showDownloadDialog"
      :versionName="downloadVersion"
      :localPath="project.downloadLocalPath"
      :remoteDirectory="project.remoteDirectory"
      :rules="project.downloadRules"
      :projectName="project.name"
      :description="downloadDescription"
      :currentDownloadedVersion="project.currentDownloadedVersion"
      @done="handleDownloadDone"
    />

    <!-- 项目编辑弹窗 -->
    <ProjectConfigDialog
      v-if="project"
      v-model:visible="showEditDialog"
      :project="project"
      @saved="handleEditSaved"
    />

    <!-- 批量删除确认弹窗 -->
    <el-dialog v-model="showBatchDeleteConfirm" title="批量删除版本" width="480px" top="15vh">
      <div class="space-y-4">
        <div class="rounded-md border border-danger-line bg-danger-soft px-4 py-3">
          <p class="text-sm font-medium text-danger">危险操作</p>
          <p class="mt-1 text-sm text-muted">
            以下版本将被永久删除，远程目录中的对应文件也将一并清除，此操作不可撤销。
          </p>
        </div>

        <div>
          <p class="mb-2 text-sm font-medium text-fg-2">
            将删除以下 {{ selectedVersions.length }} 个版本：
          </p>
          <div
            class="max-h-32 space-y-1 overflow-y-auto rounded-md border border-line bg-canvas p-3"
          >
            <p v-for="v in selectedVersions" :key="v" class="font-mono text-sm text-fg-2">
              {{ v }}
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="showBatchDeleteConfirm = false">取消</el-button>
          <el-button type="danger" :loading="isBatchDeleting" @click="handleBatchDelete">
            确认删除 {{ selectedVersions.length }} 个版本
          </el-button>
        </div>
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { ArrowLeft, Refresh, Loading, Upload, FolderOpened } from "@element-plus/icons-vue";

import type { ProjectConfig, VersionInfo, AppState } from "@renderer/types/app";
import UploadDialog from "@renderer/components/UploadDialog.vue";
import DownloadDialog from "@renderer/components/DownloadDialog.vue";
import ProjectConfigDialog from "@renderer/components/ProjectConfigDialog.vue";

const route = useRoute();
const router = useRouter();
const api = window.artifactSync;

const projectId = computed(() => route.params.projectId as string);
const project = ref<ProjectConfig | null>(null);
const userRole = ref<"developer" | "tester">("developer");
const versions = ref<VersionInfo[]>([]);
const versionTableRef = ref();
const loading = ref(false);
const deletingVersion = ref("");
const selectedVersions = ref<string[]>([]);
const deletingVersions = ref<Set<string>>(new Set());
const showBatchDeleteConfirm = ref(false);
const isBatchDeleting = ref(false);
const showUploadDialog = ref(false);
const showDownloadDialog = ref(false);
const showEditDialog = ref(false);
const downloadVersion = ref("");
const downloadDescription = ref("");

interface SortState {
  prop: string;
  order: "ascending" | "descending" | null;
}

const sortState = ref<SortState>({ prop: "createdAt", order: "descending" });

const compareSemver = (a: string, b: string): number => {
  const aParts = a.replace(/^v/i, "").split(".").map(Number);
  const bParts = b.replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((aParts[i] || 0) !== (bParts[i] || 0)) return (aParts[i] || 0) - (bParts[i] || 0);
  }
  return 0;
};

const sortedVersions = computed(() => {
  const arr = [...versions.value];
  if (!sortState.value.order || !sortState.value.prop) return arr;
  arr.sort((a, b) => {
    const cmp =
      sortState.value.prop === "name"
        ? compareSemver(a.name, b.name)
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortState.value.order === "ascending" ? cmp : -cmp;
  });
  return arr;
});

const handleSortChange = ({ prop, order }: SortState): void => {
  sortState.value = { prop, order };
};

const tableRowClassName = ({ row }: { row: VersionInfo }): string => {
  if (project.value?.currentDownloadedVersion === row.name) return "current-version-row";
  return "";
};

const goBack = (): void => {
  router.push({ name: "home" });
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const openEditDialog = (): void => {
  showEditDialog.value = true;
};

const openDir = async (dirPath: string): Promise<void> => {
  try {
    await api.openInExplorer(dirPath);
  } catch {
    ElMessage.error("无法打开目录，请检查路径是否存在。");
  }
};

const handleEditSaved = (nextState: AppState): void => {
  const updated = nextState.projects.find((p) => p.id === projectId.value);
  if (updated) {
    project.value = updated;
  }
  ElMessage.success("项目配置已更新。");
};

watch(
  () => route.query.action,
  (action) => {
    if (action === "upload" && project.value?.uploadLocalPath && userRole.value !== "tester") {
      showUploadDialog.value = true;
    }
  },
  { immediate: true },
);

const loadProject = async (): Promise<void> => {
  const currentProjectId = projectId.value;
  const state = await api.getState();
  const found = state.projects.find((p) => p.id === currentProjectId);
  userRole.value = state.settings.role;

  if (!found) {
    ElMessage.error("项目不存在");
    await router.push({ name: "home" });
    return;
  }

  project.value = found;
};

const loadVersions = async (): Promise<void> => {
  if (!project.value) return;
  loading.value = true;
  try {
    versions.value = await api.scanVersions(project.value.remoteDirectory);
  } catch (error) {
    ElMessage.error(`扫描版本失败：${(error as Error).message}`);
  } finally {
    loading.value = false;
  }
};

const handleSelectionChange = (rows: VersionInfo[]): void => {
  selectedVersions.value = rows.map((r) => r.name);
};

const clearSelection = (): void => {
  selectedVersions.value = [];
  versionTableRef.value?.clearSelection();
};

const handleDeleteVersion = async (version: string): Promise<void> => {
  if (!project.value) return;
  deletingVersion.value = version;
  try {
    await api.deleteVersion(project.value.remoteDirectory, version);
    versions.value = versions.value.filter((v) => v.name !== version);
    ElMessage.success(`版本 ${version} 已删除。`);
  } catch (error) {
    ElMessage.error(`删除版本失败：${(error as Error).message}`);
  } finally {
    deletingVersion.value = "";
  }
};

const handleBatchDelete = async (): Promise<void> => {
  if (!project.value || selectedVersions.value.length === 0) return;

  isBatchDeleting.value = true;
  const toDelete = [...selectedVersions.value];
  const failed: string[] = [];
  const succeeded: string[] = [];

  for (const version of toDelete) {
    deletingVersions.value.add(version);
    try {
      await api.deleteVersion(project.value.remoteDirectory, version);
      succeeded.push(version);
      versions.value = versions.value.filter((v) => v.name !== version);
    } catch {
      failed.push(version);
    } finally {
      deletingVersions.value.delete(version);
    }
  }

  isBatchDeleting.value = false;
  showBatchDeleteConfirm.value = false;
  selectedVersions.value = [];
  versionTableRef.value?.clearSelection();

  if (failed.length === 0) {
    ElMessage.success(`已成功删除 ${succeeded.length} 个版本`);
  } else {
    ElMessage.warning(
      `已删除 ${succeeded.length} 个，${failed.length} 个删除失败：${failed.join(", ")}`,
    );
  }

  await loadVersions();
};

const handleUploadDone = async (): Promise<void> => {
  await loadVersions();
};

const startDownload = (version: string): void => {
  downloadVersion.value = version;
  const found = versions.value.find((v) => v.name === version);
  downloadDescription.value = found?.description ?? "";
  showDownloadDialog.value = true;
};

const handleDownloadDone = async (versionName: string): Promise<void> => {
  if (!project.value) return;
  const currentProjectId = projectId.value;
  try {
    const nextState = await api.saveProject({
      ...project.value,
      currentDownloadedVersion: versionName,
    });
    const updated = nextState.projects.find((p) => p.id === currentProjectId);
    if (updated) {
      project.value = updated;
    }
  } catch {
    // non-critical: don't block the UX
  }
};

onMounted(async () => {
  await loadProject();
  await loadVersions();
});
</script>

<style scoped>
.version-table {
  --el-table-border-color: var(--as-line-soft);
  --el-table-border: 1px solid var(--el-table-border-color);
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: var(--as-canvas);
  --el-table-header-text-color: var(--as-muted);
  --el-table-text-color: var(--as-fg-2);
  --el-table-row-hover-bg-color: var(--as-canvas);
  --el-table-current-row-bg-color: var(--as-success-soft);
  border-radius: var(--as-radius-sm);
  overflow: hidden;
}

.version-table .el-table__header th.el-table__cell {
  font-size: 12px;
  font-weight: 500;
  color: var(--as-muted);
  border-bottom: 1px solid var(--as-line);
}

.version-table .el-table__body td.el-table__cell {
  border-bottom: 1px solid var(--as-line-soft);
}

.version-table .el-table__body tr.current-version-row td.el-table__cell {
  background-color: var(--as-success-soft);
}

.version-table .el-table__body tr.current-version-row:hover td.el-table__cell {
  background-color: var(--as-success-soft);
}

.version-table .el-table__body tr.el-table__row--selected td.el-table__cell {
  background-color: var(--as-danger-soft);
}

.version-table .el-table__body tr.el-table__row--selected:hover td.el-table__cell {
  background-color: var(--as-danger-soft);
}

/* Batch action bar animations */
.batch-bar-enter-active,
.batch-bar-leave-active {
  transition: all 0.25s ease;
}

.batch-bar-enter-from,
.batch-bar-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.version-table .el-table__empty-text {
  color: var(--as-muted);
}

.version-table .el-table__column-resize-proxy {
  border-color: var(--as-line);
}

.version-table .el-table__header-wrapper,
.version-table .el-table__body-wrapper {
  scrollbar-width: thin;
  scrollbar-color: var(--as-line-strong) transparent;
}

.version-table .el-table__body-wrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.version-table .el-table__body-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.version-table .el-table__body-wrapper::-webkit-scrollbar-thumb {
  background: var(--as-line-strong);
  border-radius: 3px;
}

.version-table .el-table__body-wrapper::-webkit-scrollbar-thumb:hover {
  background: var(--as-muted);
}

.version-table .el-table__cell .cell {
  padding-left: 12px;
  padding-right: 12px;
}

.version-table .el-table__header-wrapper .el-table__cell .cell {
  padding-top: 10px;
  padding-bottom: 10px;
}

.version-table .el-table__body-wrapper .el-table__cell .cell {
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Sorting caret colors */
.version-table .el-table__column-sort .sort-caret.ascending {
  border-bottom-color: var(--as-accent);
}

.version-table .el-table__column-sort .sort-caret.descending {
  border-top-color: var(--as-accent);
}
</style>
