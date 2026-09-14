<template>
  <main
    class="mx-auto flex h-[calc(100vh-var(--spacing)*14)] max-w-7xl flex-col gap-5 px-6 py-6 lg:px-10"
  >
    <section class="shrink-0 rounded-lg border border-line bg-page p-6 shadow-sm">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-semibold text-fg">欢迎，{{ operatorName }}。</h1>
        <el-tag
          v-if="state.settings.role"
          size="small"
          type="primary"
          effect="plain"
          class="role-tag"
        >
          {{ state.settings.role === "developer" ? "研发" : "测试" }}
        </el-tag>
      </div>
      <p class="mt-2 text-sm text-muted">
        软件版本：<span class="font-mono text-fg-2">{{ api.version }}</span>
      </p>
      <p class="mt-1 max-w-2xl text-sm leading-6 text-muted">
        面向开发团队的产物同步工具：管理项目配置、扫描远程版本、上传下载，支持规则过滤与任务进度追踪。
      </p>
    </section>

    <section class="flex min-h-0 flex-1 flex-col">
      <div class="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <h2 class="text-sm font-semibold text-fg">项目列表</h2>
          <el-tag size="small" type="success" effect="plain">
            {{ state.projects.length }} 个项目
          </el-tag>
          <el-tag v-if="state.groups.length > 0" size="small" type="info" effect="plain">
            {{ state.groups.length }} 个组
          </el-tag>
        </div>
        <div class="flex items-center gap-2">
          <el-button plain :icon="FolderAdd" @click="handleCreateGroup"> 新建组 </el-button>
          <el-button type="primary" :icon="Plus" @click="openCreateDialog()"> 新建项目 </el-button>
        </div>
      </div>

      <div
        v-if="state.projects.length === 0 && state.groups.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-line bg-canvas"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-canvas-2">
          <el-icon :size="24" color="var(--as-subtle)"><FolderOpened /></el-icon>
        </div>
        <div class="text-center">
          <p class="text-sm font-medium text-fg-2">还没有项目</p>
          <p class="mt-1 text-sm text-muted">创建第一个项目开始管理产物同步</p>
        </div>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog()"> 新建项目 </el-button>
      </div>

      <div v-else class="flex-1 space-y-5 overflow-y-auto pr-1">
        <section v-for="group in projectGroups" :key="group.key" class="space-y-3">
          <div
            class="flex items-center justify-between rounded-lg border border-l-[3px] border-line bg-canvas px-4 py-3"
            :style="{ borderLeftColor: group.color }"
          >
            <button
              type="button"
              class="flex min-w-0 items-center gap-2.5 rounded-md px-1 py-1 text-left"
              @click="toggleGroup(group.key)"
            >
              <el-icon :size="16" color="var(--as-muted)">
                <ArrowDown v-if="!isGroupCollapsed(group.key)" />
                <ArrowRight v-else />
              </el-icon>
              <span
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: group.color }"
              />
              <span class="truncate text-sm font-semibold text-fg">{{ group.name }}</span>
              <el-tag size="small" type="info" effect="plain">
                {{ group.projects.length }}
              </el-tag>
            </button>
            <div v-if="group.id" class="flex items-center gap-1">
              <el-button text :icon="Plus" @click="openCreateDialog(group.id)">
                新建项目
              </el-button>
              <el-dropdown
                trigger="click"
                @command="(command: string) => handleGroupAction(command, group.id!)"
              >
                <el-button text :icon="MoreFilled" aria-label="组操作" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename" :icon="Edit">编辑组</el-dropdown-item>
                    <el-dropdown-item command="delete" :icon="Delete" divided class="text-danger!">
                      删除组
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <template v-if="!isGroupCollapsed(group.key)">
            <div v-if="group.projects.length > 0" class="space-y-3">
              <ProjectCard
                v-for="project in group.projects"
                :key="project.id"
                :project="project"
                :isRecent="project.id === state.settings.recentProjectId"
                :hasNewerVersion="hasNewerVersion(project)"
                :versionSummary="summaryFor(project)"
                :userRole="state.settings.role"
                :cleanupCount="cleanupVersions(project).length"
                :cleaning="cleaningProjectId === project.id"
                @open="goToProjectDetail"
                @open-dir="openDir"
                @action="handleProjectAction"
                @cleanup="handleCleanup"
              />
            </div>
            <div
              v-else
              class="rounded-lg border border-dashed border-line bg-page px-4 py-6 text-center text-sm text-muted"
            >
              该组暂无项目
            </div>
          </template>
        </section>
      </div>
    </section>

    <ProjectConfigDialog
      v-model:visible="showProjectDialog"
      :project="editingProject"
      :groups="state.groups"
      :initialGroupId="createGroupId"
      @saved="handleProjectSaved"
    />

    <ProjectGroupDialog
      v-model:visible="showGroupDialog"
      :group="editingGroup"
      @saved="handleGroupSaved"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowDown,
  ArrowRight,
  Delete,
  Edit,
  FolderAdd,
  FolderOpened,
  MoreFilled,
  Plus,
} from "@element-plus/icons-vue";
import { VERSION_RETENTION_DAYS, compareVersionNames } from "@shared/version-retention";
import { DEFAULT_GROUP_COLOR } from "@shared/group-colors";
import type { AppState, ProjectConfig, ProjectGroup, VersionSummary } from "@renderer/types/app";
import ProjectCard from "@renderer/components/ProjectCard.vue";
import ProjectConfigDialog from "@renderer/components/ProjectConfigDialog.vue";
import ProjectGroupDialog from "@renderer/components/ProjectGroupDialog.vue";

const api = window.artifactSync;
const router = useRouter();

const state = reactive<AppState>({
  settings: {
    operatorName: "",
    recentProjectId: null,
    role: "developer",
    notifications: { system: true, inApp: true },
  },
  groups: [],
  projects: [],
});

const operatorName = computed(() => state.settings.operatorName || "未设置");
const showProjectDialog = ref(false);
const editingProject = ref<ProjectConfig | null>(null);
const createGroupId = ref<string | null>(null);
const showGroupDialog = ref(false);
const editingGroup = ref<ProjectGroup | null>(null);
const versionSummaries = ref<Record<string, VersionSummary>>({});
const cleaningProjectId = ref("");

const projectGroups = computed(() => {
  const groups = state.groups.map((group) => ({
    key: group.id,
    id: group.id as string | null,
    name: group.name,
    color: group.color,
    projects: state.projects.filter((project) => project.groupId === group.id),
  }));

  const ungrouped = state.projects.filter(
    (project) => !project.groupId || !state.groups.some((group) => group.id === project.groupId),
  );

  if (ungrouped.length > 0 || groups.length === 0) {
    groups.push({
      key: "ungrouped",
      id: null,
      name: "未组",
      color: DEFAULT_GROUP_COLOR,
      projects: ungrouped,
    });
  }

  return groups;
});

const collapsedGroups = ref<Set<string>>(new Set());

const isGroupCollapsed = (key: string): boolean => collapsedGroups.value.has(key);

const toggleGroup = (key: string): void => {
  const next = new Set(collapsedGroups.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsedGroups.value = next;
};

const summaryFor = (project: ProjectConfig): VersionSummary | undefined => {
  return versionSummaries.value[project.remoteDirectory];
};

const cleanupVersions = (project: ProjectConfig): string[] => {
  const summary = summaryFor(project);
  if (!summary) return [];
  return summary.expiredVersions.filter((version) => version !== project.currentDownloadedVersion);
};

const hasNewerVersion = (project: ProjectConfig): boolean => {
  const latest = summaryFor(project)?.latestVersion;
  if (!project.currentDownloadedVersion || !latest) return false;
  return compareVersionNames(latest, project.currentDownloadedVersion) > 0;
};

const loadVersionSummaries = async (projects = state.projects): Promise<void> => {
  const directories = [
    ...new Set(projects.map((project) => project.remoteDirectory).filter(Boolean)),
  ];
  if (directories.length === 0) {
    versionSummaries.value = {};
    return;
  }

  try {
    const summaries = await api.scanVersionSummaries(directories);
    versionSummaries.value = Object.fromEntries(
      summaries.map((summary) => [summary.remoteDirectory, summary]),
    );
  } catch {
    // 首页摘要按非关键信息处理；失败时保留已有数据。
  }
};

const goToProjectDetail = (projectId: string): void => {
  router.push({ name: "project-detail", params: { projectId } });
};

const openCreateDialog = (groupId: string | null = null): void => {
  editingProject.value = null;
  createGroupId.value = groupId;
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
  state.groups = nextState.groups;
  state.projects = nextState.projects;
  createGroupId.value = null;
  await loadVersionSummaries(nextState.projects);
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
      state.groups = nextState.groups;
      state.projects = nextState.projects;
      await loadVersionSummaries(nextState.projects);
      ElMessage.success("项目配置已删除。");
    } catch (error) {
      ElMessage.error((error as Error).message);
    }
  }
};

const handleCreateGroup = (): void => {
  editingGroup.value = null;
  showGroupDialog.value = true;
};

const handleRenameGroup = (groupId: string): void => {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) return;
  editingGroup.value = group;
  showGroupDialog.value = true;
};

const handleGroupSaved = (nextState: AppState): void => {
  state.settings = nextState.settings;
  state.groups = nextState.groups;
  state.projects = nextState.projects;
};
const handleDeleteGroup = async (groupId: string): Promise<void> => {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) return;

  try {
    await ElMessageBox.confirm(
      `删除组“${group.name}”后，组内项目将移到“未组”，不会删除项目或远程文件。是否继续？`,
      "删除组",
      {
        confirmButtonText: "删除组",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return;
  }

  try {
    const nextState = await api.deleteGroup(groupId);
    state.settings = nextState.settings;
    state.groups = nextState.groups;
    state.projects = nextState.projects;
    ElMessage.success("组已删除，项目已移到未组。");
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const handleGroupAction = async (command: string, groupId: string): Promise<void> => {
  if (command === "rename") {
    await handleRenameGroup(groupId);
  } else if (command === "delete") {
    await handleDeleteGroup(groupId);
  }
};

const formatCutoff = (): string => {
  const cutoff = new Date(Date.now() - VERSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return cutoff.toLocaleDateString("zh-CN");
};

const handleCleanup = async (project: ProjectConfig): Promise<void> => {
  const versions = cleanupVersions(project);
  if (versions.length === 0) return;

  const preview = versions.slice(0, 5).join("、");
  const suffix = versions.length > 5 ? ` 等 ${versions.length} 个版本` : "";
  const retainedCurrent = project.currentDownloadedVersion
    ? `\n当前使用版本 ${project.currentDownloadedVersion} 将保留。`
    : "";

  try {
    await ElMessageBox.confirm(
      `将永久删除 ${project.name} 中早于 ${formatCutoff()} 的版本：${preview}${suffix}。\n远程目录中的对应文件也会被删除。${retainedCurrent}`,
      "清理旧版本",
      {
        confirmButtonText: `删除 ${versions.length} 个版本`,
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return;
  }

  cleaningProjectId.value = project.id;
  try {
    const results = await api.deleteVersions(project.remoteDirectory, versions);
    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;

    if (failed === 0) {
      ElMessage.success(`已删除 ${succeeded} 个旧版本。`);
    } else {
      ElMessage.warning(`已删除 ${succeeded} 个，${failed} 个删除失败。`);
    }
    await loadVersionSummaries();
  } catch (error) {
    ElMessage.error(`清理旧版本失败：${(error as Error).message}`);
  } finally {
    cleaningProjectId.value = "";
  }
};

onMounted(async () => {
  try {
    const nextState = await api.getState();
    state.settings = nextState.settings;
    state.groups = nextState.groups;
    state.projects = nextState.projects;
    await loadVersionSummaries(nextState.projects);
  } catch (error) {
    ElMessage.error(`读取本地配置失败：${(error as Error).message}`);
  }
});
</script>
