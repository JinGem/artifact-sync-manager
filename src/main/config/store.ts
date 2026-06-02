import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface AppSettings {
  operatorName: string;
  recentProjectId: string | null;
  role: "developer" | "tester";
}

export interface ProjectConfig {
  id: string;
  name: string;
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
  projects: ProjectConfig[];
}

const defaultState = (): AppState => ({
  settings: {
    operatorName: "",
    recentProjectId: null,
    role: "developer",
  },
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
      },
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
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

const normalizeProject = (project: ProjectConfig): ProjectConfig => ({
  ...project,
  name: project.name.trim(),
  remoteDirectory: project.remoteDirectory.trim(),
  uploadLocalPath: project.uploadLocalPath.trim(),
  downloadLocalPath: project.downloadLocalPath.trim(),
  uploadRules: project.uploadRules,
  downloadRules: project.downloadRules,
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

  async saveProject(
    project: Omit<ProjectConfig, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<AppState> {
    const state = await readStateFile();
    const now = new Date().toISOString();
    const normalizedName = project.name.trim();

    if (!normalizedName) {
      throw new Error("项目名称不能为空。");
    }

    if (!project.remoteDirectory.trim()) {
      throw new Error("远程目录不能为空。");
    }

    const duplicate = state.projects.find(
      (item) => item.name.toLowerCase() === normalizedName.toLowerCase() && item.id !== project.id,
    );

    if (duplicate) {
      throw new Error("项目名称已存在。");
    }

    if (project.id) {
      const index = state.projects.findIndex((item) => item.id === project.id);

      if (index === -1) {
        throw new Error("未找到要更新的项目。");
      }

      const updatedProject = normalizeProject({
        ...state.projects[index],
        ...project,
        id: project.id,
        createdAt: state.projects[index].createdAt,
        updatedAt: now,
      });

      state.projects[index] = updatedProject;
      state.settings.recentProjectId = updatedProject.id;
      await writeStateFile(state);
      return state;
    }

    const newProject = normalizeProject({
      ...project,
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
