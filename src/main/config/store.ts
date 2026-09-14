import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEFAULT_GROUP_COLOR, getDefaultGroupColor, isValidGroupColor } from "@shared/group-colors";

export interface NotificationSettings {
  system: boolean;
  inApp: boolean;
}

export interface AppSettings {
  operatorName: string;
  recentProjectId: string | null;
  role: "developer" | "tester";
  notifications: NotificationSettings;
}

export interface ProjectGroup {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  groupId: string | null;
  remoteDirectory: string;
  uploadLocalPath: string;
  downloadLocalPath: string;
  uploadRules: string;
  downloadRules: string;
  createdAt: string;
  updatedAt: string;
  currentDownloadedVersion?: string;
}

export interface AppState {
  settings: AppSettings;
  groups: ProjectGroup[];
  projects: ProjectConfig[];
}

const defaultState = (): AppState => ({
  settings: {
    operatorName: "",
    recentProjectId: null,
    role: "developer",
    notifications: {
      system: true,
      inApp: true,
    },
  },
  groups: [],
  projects: [],
});

const stateFilePath = (): string => join(app.getPath("userData"), "config", "app-state.json");

const ensureStateDirectory = async (): Promise<void> => {
  await mkdir(dirname(stateFilePath()), { recursive: true });
};

const readStateFile = async (): Promise<AppState> => {
  try {
    const content = await readFile(stateFilePath(), "utf-8");
    const parsed = JSON.parse(content) as Partial<AppState>;

    return {
      settings: {
        operatorName: parsed.settings?.operatorName ?? "",
        recentProjectId: parsed.settings?.recentProjectId ?? null,
        role: parsed.settings?.role === "tester" ? "tester" : "developer",
        notifications: {
          system: parsed.settings?.notifications?.system !== false,
          inApp: parsed.settings?.notifications?.inApp !== false,
        },
      },
      groups: Array.isArray(parsed.groups)
        ? parsed.groups
            .map((group) => normalizeGroup(group))
            .filter((group) => group.id && group.name)
        : [],
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((project) => normalizeProject(project))
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultState();
    }

    throw error;
  }
};

const writeStateFile = async (state: AppState): Promise<void> => {
  await ensureStateDirectory();
  await writeFile(stateFilePath(), JSON.stringify(state, null, 2), "utf-8");
};

const normalizeGroup = (group: ProjectGroup): ProjectGroup => ({
  id: group.id,
  name: group.name.trim(),
  color: isValidGroupColor(group.color) ? group.color : DEFAULT_GROUP_COLOR,
  createdAt: group.createdAt,
  updatedAt: group.updatedAt,
});

const normalizeProject = (project: ProjectConfig): ProjectConfig => ({
  ...project,
  name: project.name.trim(),
  groupId: typeof project.groupId === "string" ? project.groupId : null,
  remoteDirectory: project.remoteDirectory.trim(),
  uploadLocalPath: project.uploadLocalPath?.trim() ?? "",
  downloadLocalPath: project.downloadLocalPath?.trim() ?? "",
  uploadRules: project.uploadRules ?? "",
  downloadRules: project.downloadRules ?? "",
});

export const appStateStore = {
  async getState(): Promise<AppState> {
    return readStateFile();
  },

  async saveOperatorName(operatorName: string): Promise<AppState> {
    const trimmed = operatorName.trim();

    if (!trimmed) {
      throw new Error("操作者名称不能为空。");
    }

    const state = await readStateFile();
    state.settings.operatorName = trimmed;
    await writeStateFile(state);
    return state;
  },

  async saveUserProfile(profile: {
    operatorName: string;
    role: "developer" | "tester";
  }): Promise<AppState> {
    const trimmed = profile.operatorName.trim();

    if (!trimmed) {
      throw new Error("操作者名称不能为空。");
    }

    const state = await readStateFile();
    state.settings.operatorName = trimmed;
    state.settings.role = profile.role;
    await writeStateFile(state);
    return state;
  },

  async saveNotificationSettings(settings: NotificationSettings): Promise<AppState> {
    const state = await readStateFile();
    state.settings.notifications = {
      system: settings.system !== false,
      inApp: settings.inApp !== false,
    };
    await writeStateFile(state);
    return state;
  },

  async saveGroup(group: { id?: string; name: string; color?: string }): Promise<AppState> {
    const state = await readStateFile();
    const now = new Date().toISOString();
    const name = group.name.trim();
    const color = isValidGroupColor(group.color) ? group.color : undefined;

    if (!name) {
      throw new Error("组名称不能为空。");
    }

    const duplicate = state.groups.find(
      (item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== group.id,
    );

    if (duplicate) {
      throw new Error("组名称已存在。");
    }

    if (group.id) {
      const index = state.groups.findIndex((item) => item.id === group.id);
      if (index === -1) {
        throw new Error("未找到要更新的组。");
      }

      state.groups[index] = {
        ...state.groups[index],
        name,
        color: color ?? state.groups[index].color,
        updatedAt: now,
      };
    } else {
      state.groups.unshift({
        id: crypto.randomUUID(),
        name,
        color: color ?? getDefaultGroupColor(state.groups.length),
        createdAt: now,
        updatedAt: now,
      });
    }

    await writeStateFile(state);
    return state;
  },

  async deleteGroup(groupId: string): Promise<AppState> {
    const state = await readStateFile();
    const now = new Date().toISOString();

    state.groups = state.groups.filter((group) => group.id !== groupId);
    state.projects = state.projects.map((project) =>
      project.groupId === groupId ? { ...project, groupId: null, updatedAt: now } : project,
    );

    await writeStateFile(state);
    return state;
  },

  async saveProject(
    project: Omit<ProjectConfig, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
      newGroupName?: string;
    },
  ): Promise<AppState> {
    const state = await readStateFile();
    const now = new Date().toISOString();
    const { newGroupName, ...projectInput } = project;
    const normalizedName = projectInput.name.trim();

    if (!normalizedName) {
      throw new Error("项目名称不能为空。");
    }

    if (!projectInput.remoteDirectory.trim()) {
      throw new Error("远程目录不能为空。");
    }

    const duplicate = state.projects.find(
      (item) =>
        item.name.toLowerCase() === normalizedName.toLowerCase() && item.id !== projectInput.id,
    );

    if (duplicate) {
      throw new Error("项目名称已存在。");
    }

    let groupId = projectInput.groupId ?? null;
    const requestedGroupName = newGroupName?.trim();

    if (!groupId && requestedGroupName) {
      const existingGroup = state.groups.find(
        (group) => group.name.toLowerCase() === requestedGroupName.toLowerCase(),
      );

      if (existingGroup) {
        groupId = existingGroup.id;
      } else {
        const newGroup: ProjectGroup = {
          id: crypto.randomUUID(),
          name: requestedGroupName,
          color: getDefaultGroupColor(state.groups.length),
          createdAt: now,
          updatedAt: now,
        };
        state.groups.unshift(newGroup);
        groupId = newGroup.id;
      }
    }

    if (groupId && !state.groups.some((group) => group.id === groupId)) {
      throw new Error("所选组不存在。");
    }

    if (projectInput.id) {
      const index = state.projects.findIndex((item) => item.id === projectInput.id);

      if (index === -1) {
        throw new Error("未找到要更新的项目。");
      }

      const updatedProject = normalizeProject({
        ...state.projects[index],
        ...projectInput,
        groupId,
        id: projectInput.id,
        createdAt: state.projects[index].createdAt,
        updatedAt: now,
      });

      state.projects[index] = updatedProject;
      state.settings.recentProjectId = updatedProject.id;
      await writeStateFile(state);
      return state;
    }

    const newProject = normalizeProject({
      ...projectInput,
      groupId,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });

    state.projects.unshift(newProject);
    state.settings.recentProjectId = newProject.id;
    await writeStateFile(state);
    return state;
  },
  async deleteProject(projectId: string): Promise<AppState> {
    const state = await readStateFile();
    state.projects = state.projects.filter((item) => item.id !== projectId);

    if (state.settings.recentProjectId === projectId) {
      state.settings.recentProjectId = state.projects[0]?.id ?? null;
    }

    await writeStateFile(state);
    return state;
  },

  async resetState(): Promise<AppState> {
    const state = defaultState();
    await writeStateFile(state);
    return state;
  },

  async setRecentProject(projectId: string): Promise<AppState> {
    const state = await readStateFile();
    const exists = state.projects.some((item) => item.id === projectId);
    state.settings.recentProjectId = exists ? projectId : null;
    await writeStateFile(state);
    return state;
  },

  async importState(partial: Partial<AppState>): Promise<{
    created: number;
    skipped: number;
    error: number;
    state: AppState;
  }> {
    const current = await readStateFile();
    let created = 0;
    let skipped = 0;
    let error = 0;

    const importedGroups: ProjectGroup[] = Array.isArray(partial.groups) ? partial.groups : [];
    const groupIdMap = new Map<string, string>();

    for (const group of importedGroups) {
      const name = group.name?.trim();
      if (!name) continue;

      const existing = current.groups.find(
        (item) => item.name.toLowerCase() === name.toLowerCase(),
      );

      if (existing) {
        if (group.id) groupIdMap.set(group.id, existing.id);
        continue;
      }

      const newGroup: ProjectGroup = {
        id: crypto.randomUUID(),
        name,
        color: isValidGroupColor(group.color)
          ? group.color
          : getDefaultGroupColor(current.groups.length),
        createdAt: group.createdAt || new Date().toISOString(),
        updatedAt: group.updatedAt || new Date().toISOString(),
      };
      current.groups.push(newGroup);
      if (group.id) groupIdMap.set(group.id, newGroup.id);
    }

    // Only import projects; skip settings (operator name is local preference)
    if (Array.isArray(partial.projects)) {
      for (const p of partial.projects) {
        try {
          const normalizedName = p.name?.trim();

          if (!normalizedName) {
            error++;
            continue;
          }

          const exists = current.projects.some(
            (existing) => existing.name.toLowerCase() === normalizedName.toLowerCase(),
          );

          if (exists) {
            skipped++;
            continue;
          }

          const newProject = normalizeProject({
            ...p,
            groupId: p.groupId ? (groupIdMap.get(p.groupId) ?? null) : null,
            id: p.id || crypto.randomUUID(),
            name: normalizedName,
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
          });

          current.projects.push(newProject);
          created++;
        } catch {
          error++;
        }
      }
    }

    await writeStateFile(current);
    return { created, skipped, error, state: current };
  },
};
