import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface TaskRecord {
  id: string;
  type: "upload" | "download";
  projectName: string;
  version: string;
  status: "running" | "completed" | "failed" | "cancelled";
  current: number;
  total: number;
  currentFile: string;
  errorMessage: string;
  errorCode: string;
  startedAt: string;
  completedAt: string;
  params: Record<string, unknown>;
}

import { toRaw } from "vue";

export const useTaskStore = defineStore("tasks", () => {
  const tasks = ref<TaskRecord[]>([]);

  const runningCount = computed(() => tasks.value.filter((t) => t.status === "running").length);

  const failedTasks = computed(() => tasks.value.filter((t) => t.status === "failed"));

  const failedCount = computed(() => failedTasks.value.length);

  const addTask = (task: TaskRecord): void => {
    tasks.value.unshift(task);

    // Trim to last 50 tasks to avoid unbounded growth
    if (tasks.value.length > 50) {
      tasks.value = tasks.value.slice(0, 50);
    }
  };

  const updateTask = (id: string, partial: Partial<TaskRecord>): void => {
    const index = tasks.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      Object.assign(tasks.value[index], partial);
    }
  };

  const retryTask = async (id: string): Promise<void> => {
    const task = tasks.value.find((t) => t.id === id);
    if (!task) return;
    if (task.status !== "failed") return;

    const api = window.artifactSync;
    let cleanup: () => void = () => {};

    try {
      updateTask(id, {
        status: "running",
        current: 0,
        total: 0,
        currentFile: "",
        errorMessage: "",
        errorCode: "",
      });

      if (task.type === "upload") {
        cleanup = api.onUploadProgress((progress) => {
          updateTask(id, {
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
        // Deep clone params to strip Pinia reactive proxy before IPC
        const uploadParams = JSON.parse(JSON.stringify(toRaw(task.params)));
        await api.startUpload(uploadParams as unknown as Parameters<typeof api.startUpload>[0]);
      } else {
        cleanup = api.onDownloadProgress((progress) => {
          updateTask(id, {
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
        // Deep clone params to strip Pinia reactive proxy before IPC
        const downloadParams = JSON.parse(JSON.stringify(toRaw(task.params)));
        await api.startDownload(
          downloadParams as unknown as Parameters<typeof api.startDownload>[0],
        );
      }

      cleanup();
      updateTask(id, { status: "completed" });
    } catch (error) {
      cleanup();
      updateTask(id, { status: "failed", errorMessage: (error as Error).message });
    }
  };

  const clearCompleted = (): void => {
    tasks.value = tasks.value.filter((t) => t.status === "running");
  };

  const clearAll = (): void => {
    tasks.value = [];
  };

  return {
    tasks,
    runningCount,
    failedTasks,
    failedCount,
    addTask,
    updateTask,
    retryTask,
    clearCompleted,
    clearAll,
  };
});
