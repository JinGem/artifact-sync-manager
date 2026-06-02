<template>
  <main
    class="mx-auto flex h-[calc(100vh-var(--spacing)*11)] max-w-7xl flex-col gap-5 px-6 py-6 lg:px-10"
  >
    <!-- Hero: 品牌介绍 + 快速概览 -->
    <section class="grid shrink-0 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <!-- 品牌区 -->
      <div
        class="relative overflow-hidden rounded-[--radius-card] border border-white/10 p-7 shadow-2xl shadow-cyan-950/20"
      >
        <div
          class="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl"
        />
        <div
          class="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl"
        />
        <p class="relative text-sm uppercase tracking-[0.35em] text-emerald-400/70">
          Artifact Sync Manager
        </p>
        <h1 class="relative mt-3 text-2xl font-semibold tracking-tight text-white lg:text-3xl">
          本地产物同步管理
        </h1>
        <p class="relative mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          面向开发团队的产物同步工具。管理项目配置、扫描远程版本、上传下载，支持规则过滤与任务进度追踪。集成远程目录监控与系统托盘，持久化版本生命周期管理。
        </p>
        <div class="relative mt-3 flex items-center gap-2">
          <el-tag
            size="small"
            effect="dark"
            class="!h-5 !px-1.5 !text-[11px] !leading-5 !border-cyan-400/30 !bg-cyan-950/30 !text-cyan-300"
          >
            v{{ api.version }}
          </el-tag>
        </div>
        <div class="relative mt-5 flex items-center gap-4">
          <el-button
            type="primary"
            :icon="Plus"
            size="default"
            class="!rounded-xl !px-5"
            @click="openCreateDialog"
          >
            新建项目
          </el-button>
          <span class="text-sm text-slate-500">已配置 {{ state.projects.length }} 个项目</span>
        </div>
      </div>

      <!-- 快速概览 -->
      <div class="grid grid-cols-2 gap-3">
        <div
          class="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/30 hover:bg-white/8"
        >
          <p class="text-sm uppercase tracking-[0.2em] text-slate-500">操作者</p>
          <p class="mt-2 text-lg font-semibold text-white">
            {{ operatorName }}
          </p>
        </div>
        <div
          class="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/30 hover:bg-white/8"
        >
          <p class="text-sm uppercase tracking-[0.2em] text-slate-500">项目总数</p>
          <p class="mt-2 text-lg font-semibold text-white">
            {{ state.projects.length }}
          </p>
        </div>
        <div
          class="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/30 hover:bg-white/8"
        >
          <p class="text-sm uppercase tracking-[0.2em] text-slate-500">最近项目</p>
          <p class="mt-2 leading-6 text-slate-300">
            {{ recentProjectName || "暂无最近使用的项目" }}
          </p>
        </div>
      </div>
    </section>

    <!-- 项目列表 -->
    <section class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex shrink-0 items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-sm font-semibold text-white">项目列表</h2>
          <el-tag
            size="small"
            effect="dark"
            class="!border-emerald-400/30 !bg-emerald-950/30 !text-emerald-300"
          >
            {{ state.projects.length }} 个项目
          </el-tag>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="state.projects.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03]"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
          <el-icon :size="24" color="#475569"><FolderOpened /></el-icon>
        </div>
        <div class="text-center">
          <p class="text-sm font-medium text-slate-300">还没有项目</p>
          <p class="mt-1 text-sm text-slate-500">创建第一个项目开始管理产物同步</p>
        </div>
        <el-button
          type="primary"
          :icon="Plus"
          size="small"
          class="!rounded-xl"
          @click="openCreateDialog"
        >
          新建项目
        </el-button>
      </div>

      <!-- 项目卡片列表 -->
      <div v-else class="flex-1 space-y-3 overflow-y-auto pr-1">
        <div
          v-for="project in state.projects"
          :key="project.id"
          class="group cursor-pointer rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 transition-all duration-200 hover:border-emerald-400/25 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-emerald-950/10"
          @click="goToProjectDetail(project.id)"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5">
                <h3 class="text-base font-semibold text-white">
                  {{ project.name }}
                </h3>
                <el-tag
                  v-if="project.id === state.settings.recentProjectId"
                  size="small"
                  effect="dark"
                  class="!border-emerald-400/25 !bg-emerald-950/25 !text-emerald-300"
                >
                  最近
                </el-tag>
              </div>
              <div class="mt-4 grid gap-2.5 sm:grid-cols-3" @click.stop>
                <div
                  v-if="project.remoteDirectory"
                  class="group/path cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-emerald-400/30 hover:bg-emerald-950/15"
                  @click="openDir(project.remoteDirectory)"
                >
                  <p class="text-xs uppercase tracking-[0.15em] text-slate-500">远程目录</p>
                  <p
                    class="mt-1 truncate text-sm text-slate-300 font-mono group-hover/path:text-emerald-300 transition-colors"
                  >
                    {{ project.remoteDirectory }}
                  </p>
                </div>
                <div
                  v-if="project.uploadLocalPath"
                  class="group/path cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-emerald-400/30 hover:bg-emerald-950/15"
                  @click="openDir(project.uploadLocalPath)"
                >
                  <p class="text-xs uppercase tracking-[0.15em] text-slate-500">上传路径</p>
                  <p
                    class="mt-1 truncate text-sm text-slate-300 font-mono group-hover/path:text-emerald-300 transition-colors"
                  >
                    {{ project.uploadLocalPath }}
                  </p>
                </div>
                <div
                  v-if="project.downloadLocalPath"
                  class="group/path cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-emerald-400/30 hover:bg-emerald-950/15"
                  @click="openDir(project.downloadLocalPath)"
                >
                  <p class="text-xs uppercase tracking-[0.15em] text-slate-500">下载路径</p>
                  <p
                    class="mt-1 truncate text-sm text-slate-300 font-mono group-hover/path:text-emerald-300 transition-colors"
                  >
                    {{ project.downloadLocalPath }}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-2" @click.stop>
              <el-tag
                v-if="hasNewerVersion(project)"
                size="small"
                type="warning"
                effect="dark"
                class="!h-5 !px-1.5 !text-[11px] !leading-5 !border-amber-400/30"
              >
                有新版本
              </el-tag>
              <el-tag
                v-if="project.currentDownloadedVersion"
                size="small"
                type="info"
                effect="dark"
                class="!h-5 !px-1.5 !text-[11px] !leading-5"
              >
                {{ project.currentDownloadedVersion }}
              </el-tag>
              <el-button size="small" plain :icon="View" @click="goToProjectDetail(project.id)">
                详情
              </el-button>
              <el-dropdown
                trigger="click"
                @command="(cmd: string) => handleProjectAction(cmd, project)"
              >
                <el-button size="small" plain class="!border-white/10 !px-2">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="recent" :icon="Star">
                      设为最近使用
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" :icon="Delete" divided class="!text-red-400">
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
