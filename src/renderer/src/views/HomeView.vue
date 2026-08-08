<template>
  <main
    class="mx-auto flex h-[calc(100vh-var(--spacing)*11)] max-w-7xl flex-col gap-5 px-6 py-6 lg:px-10"
  >
    <!-- Hero: 品牌介绍 + 快速概览 -->
    <section class="grid shrink-0 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <!-- 品牌区 -->
      <div class="rounded-lg border border-line bg-page p-7 shadow-sm">
        <p class="text-sm text-muted">Artifact Sync Manager</p>
        <h1 class="mt-3 text-2xl font-semibold tracking-tight text-fg lg:text-3xl">
          本地产物同步管理
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-muted">
          面向开发团队的产物同步工具。管理项目配置、扫描远程版本、上传下载，支持规则过滤与任务进度追踪。集成远程目录监控与系统托盘，持久化版本生命周期管理。
        </p>
        <div class="mt-3 flex items-center gap-2">
          <span
            class="inline-flex h-5 items-center rounded-full border border-accent-line bg-accent-soft px-1.5 text-[11px] leading-5 text-accent"
          >
            v{{ api.version }}
          </span>
        </div>
        <div class="mt-5 flex items-center gap-4">
          <el-button type="primary" :icon="Plus" size="default" @click="openCreateDialog">
            新建项目
          </el-button>
          <span class="text-sm text-subtle">已配置 {{ state.projects.length }} 个项目</span>
        </div>
      </div>

      <!-- 快速概览 -->
      <div class="grid grid-cols-2 gap-3">
        <div
          class="rounded-lg border border-line bg-page p-4 transition hover:border-accent-line hover:shadow-sm"
        >
          <p class="text-xs text-subtle">操作者</p>
          <p class="mt-2 text-lg font-semibold text-fg">
            {{ operatorName }}
          </p>
        </div>
        <div
          class="rounded-lg border border-line bg-page p-4 transition hover:border-accent-line hover:shadow-sm"
        >
          <p class="text-xs text-subtle">项目总数</p>
          <p class="mt-2 text-lg font-semibold text-fg">
            {{ state.projects.length }}
          </p>
        </div>
        <div
          class="col-span-2 rounded-lg border border-line bg-page p-4 transition hover:border-accent-line hover:shadow-sm"
        >
          <p class="text-xs text-subtle">最近项目</p>
          <p class="mt-2 leading-6 text-fg-2">
            {{ recentProjectName || "暂无最近使用的项目" }}
          </p>
        </div>
      </div>
    </section>

    <!-- 项目列表 -->
    <section class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex shrink-0 items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-sm font-semibold text-fg">项目列表</h2>
          <span
            class="inline-flex h-5 items-center rounded-full border border-success-line bg-success-soft px-2 text-[11px] leading-5 text-success"
          >
            {{ state.projects.length }} 个项目
          </span>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="state.projects.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-line bg-canvas"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-canvas-2">
          <el-icon :size="24" color="var(--as-subtle)"><FolderOpened /></el-icon>
        </div>
        <div class="text-center">
          <p class="text-sm font-medium text-fg-2">还没有项目</p>
          <p class="mt-1 text-sm text-muted">创建第一个项目开始管理产物同步</p>
        </div>
        <el-button type="primary" :icon="Plus" size="small" @click="openCreateDialog">
          新建项目
        </el-button>
      </div>

      <!-- 项目卡片列表 -->
      <div v-else class="flex-1 space-y-3 overflow-y-auto pr-1">
        <div
          v-for="project in state.projects"
          :key="project.id"
          class="group cursor-pointer rounded-lg border border-line bg-page p-4 transition-all duration-200 hover:border-accent-line hover:shadow-md"
          @click="goToProjectDetail(project.id)"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5">
                <h3 class="text-base font-semibold text-fg">
                  {{ project.name }}
                </h3>
                <span
                  v-if="project.id === state.settings.recentProjectId"
                  class="inline-flex h-5 items-center rounded-full border border-accent-line bg-accent-soft px-2 text-[11px] leading-5 text-accent"
                >
                  最近
                </span>
              </div>
              <div class="mt-4 grid gap-2.5 sm:grid-cols-3" @click.stop>
                <div
                  v-if="project.remoteDirectory"
                  class="group/path cursor-pointer rounded-md border border-line-soft bg-canvas px-3.5 py-2.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
                  @click="openDir(project.remoteDirectory)"
                >
                  <p class="text-xs text-subtle">远程目录</p>
                  <p
                    class="mt-1 truncate font-mono text-sm text-fg-2 transition-colors group-hover/path:text-accent"
                  >
                    {{ project.remoteDirectory }}
                  </p>
                </div>
                <div
                  v-if="project.uploadLocalPath"
                  class="group/path cursor-pointer rounded-md border border-line-soft bg-canvas px-3.5 py-2.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
                  @click="openDir(project.uploadLocalPath)"
                >
                  <p class="text-xs text-subtle">上传路径</p>
                  <p
                    class="mt-1 truncate font-mono text-sm text-fg-2 transition-colors group-hover/path:text-accent"
                  >
                    {{ project.uploadLocalPath }}
                  </p>
                </div>
                <div
                  v-if="project.downloadLocalPath"
                  class="group/path cursor-pointer rounded-md border border-line-soft bg-canvas px-3.5 py-2.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
                  @click="openDir(project.downloadLocalPath)"
                >
                  <p class="text-xs text-subtle">下载路径</p>
                  <p
                    class="mt-1 truncate font-mono text-sm text-fg-2 transition-colors group-hover/path:text-accent"
                  >
                    {{ project.downloadLocalPath }}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-2" @click.stop>
              <span
                v-if="hasNewerVersion(project)"
                class="inline-flex h-5 items-center rounded-full border border-warning-line bg-warning-soft px-1.5 text-[11px] leading-5 text-warning"
              >
                有新版本
              </span>
              <span
                v-if="project.currentDownloadedVersion"
                class="inline-flex h-5 items-center rounded-full border border-line-soft bg-canvas px-1.5 text-[11px] leading-5 text-muted"
              >
                {{ project.currentDownloadedVersion }}
              </span>
              <el-button size="small" plain :icon="View" @click="goToProjectDetail(project.id)">
                详情
              </el-button>
              <el-dropdown
                trigger="click"
                @command="(cmd: string) => handleProjectAction(cmd, project)"
              >
                <el-button size="small" plain>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="recent" :icon="Star">
                      设为最近使用
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" :icon="Delete" divided class="text-danger!">
                      删除项目
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 项目配置弹窗 -->
    <ProjectConfigDialog
      v-model:visible="showProjectDialog"
      :project="editingProject"
      @saved="handleProjectSaved"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Plus, View, Star, Delete, MoreFilled, FolderOpened } from "@element-plus/icons-vue";
import type { AppState, ProjectConfig, VersionInfo } from "@renderer/types/app";
import ProjectConfigDialog from "@renderer/components/ProjectConfigDialog.vue";

const api = window.artifactSync;
const router = useRouter();

const state = reactive<AppState>({
  settings: { operatorName: "", recentProjectId: null, role: "developer" },
  projects: [],
});

const showProjectDialog = ref(false);
const editingProject = ref<ProjectConfig | null>(null);
const projectLatestVersions = ref<Record<string, string>>({});

const operatorName = computed(() => state.settings.operatorName || "未设置");

const recentProjectName = computed(
  () => state.projects.find((item) => item.id === state.settings.recentProjectId)?.name ?? "",
);

const parseSemver = (name: string): number[] => {
  const parts = name.replace(/^v/i, "").split(".").map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
};

const sortVersionsDesc = (versions: VersionInfo[]): VersionInfo[] => {
  return [...versions].sort((a, b) => {
    const [aMajor, aMinor, aPatch] = parseSemver(a.name);
    const [bMajor, bMinor, bPatch] = parseSemver(b.name);
    if (aMajor !== bMajor) return bMajor - aMajor;
    if (aMinor !== bMinor) return bMinor - aMinor;
    return bPatch - aPatch;
  });
};

const hasNewerVersion = (project: ProjectConfig): boolean => {
  if (!project.currentDownloadedVersion) return false;
  const latest = projectLatestVersions.value[project.id];
  if (!latest) return false;
  if (latest === project.currentDownloadedVersion) return false;
  const [cMajor, cMinor, cPatch] = parseSemver(project.currentDownloadedVersion);
  const [lMajor, lMinor, lPatch] = parseSemver(latest);
  if (lMajor > cMajor) return true;
  if (lMajor < cMajor) return false;
  if (lMinor > cMinor) return true;
  if (lMinor < cMinor) return false;
  return lPatch > cPatch;
};

const scanProjectLatestVersions = async (projects: ProjectConfig[]): Promise<void> => {
  for (const p of projects) {
    if (!p.remoteDirectory || !p.currentDownloadedVersion) continue;
    try {
      const versions = await api.scanVersions(p.remoteDirectory);
      const sorted = sortVersionsDesc(versions);
      if (sorted.length > 0) {
        projectLatestVersions.value[p.id] = sorted[0].name;
      }
    } catch {
      // non-critical: silently skip
    }
  }
};

const goToProjectDetail = (projectId: string, action?: "upload"): void => {
  router.push({
    name: "project-detail",
    params: { projectId },
    query: action ? { action } : undefined,
  });
};

const openCreateDialog = (): void => {
  editingProject.value = null;
  showProjectDialog.value = true;
};

const openDir = async (dirPath: string): Promise<void> => {
  try {
    await api.openInExplorer(dirPath);
  } catch {
    ElMessage.error("无法打开目录，请检查路径是否存在。");
  }
};

const handleProjectSaved = async (nextState: AppState): Promise<void> => {
  state.settings = nextState.settings;
  state.projects = nextState.projects;
  scanProjectLatestVersions(nextState.projects);
};

const handleProjectAction = async (command: string, project: ProjectConfig): Promise<void> => {
  if (command === "recent") {
    try {
      const nextState = await api.setRecentProject(project.id);
      state.settings = nextState.settings;
      state.projects = nextState.projects;
      ElMessage.success("已设为最近使用项目。");
    } catch (error) {
      ElMessage.error((error as Error).message);
    }
  } else if (command === "delete") {
    try {
      const nextState = await api.deleteProject(project.id);
      state.settings = nextState.settings;
      state.projects = nextState.projects;
      ElMessage.success("项目配置已删除。");
    } catch (error) {
      ElMessage.error((error as Error).message);
    }
  }
};

onMounted(async () => {
  try {
    const nextState = await api.getState();
    state.settings = nextState.settings;
    state.projects = nextState.projects;
    // Async scan for newer versions (non-blocking)
    scanProjectLatestVersions(state.projects);
  } catch (error) {
    ElMessage.error(`读取本地配置失败：${(error as Error).message}`);
  }
});
</script>
