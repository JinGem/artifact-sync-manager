<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-var(--spacing)*14)] max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10"
  >
    <!-- 头部 -->
    <div class="flex items-center gap-4">
      <el-button :icon="ArrowLeft" text @click="goBack">返回</el-button>
      <h1 class="text-2xl font-semibold text-fg">任务中心</h1>
      <el-tag v-if="store.failedCount > 0" size="small" type="danger" effect="plain">
        {{ store.failedCount }} 个失败
      </el-tag>
      <el-tag v-if="store.runningCount > 0" size="small" type="warning" effect="plain">
        {{ store.runningCount }} 个进行中
      </el-tag>
    </div>

    <!-- 批量操作 -->
    <div v-if="store.tasks.length > 0" class="flex gap-3">
      <el-button plain @click="store.clearCompleted">清除已完成</el-button>
      <el-button plain @click="store.clearAll">清除全部</el-button>
    </div>

    <!-- 空状态 -->
    <div
      v-if="store.tasks.length === 0"
      class="rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center text-fg-2"
    >
      暂无任务记录。执行上传或下载操作后，任务记录将在此展示。
    </div>

    <!-- 任务列表 -->
    <div v-else class="grid gap-3">
      <div
        v-for="task in store.tasks"
        :key="task.id"
        class="rounded-lg border border-line bg-page p-5 transition hover:border-accent-line hover:shadow-sm"
      >
        <div class="flex items-start justify-between gap-4">
          <!-- 左侧：图标 + 信息 -->
          <div class="flex min-w-0 flex-1 items-start gap-4">
            <!-- 状态图标 -->
            <div
              class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
              :class="statusIconBg(task.status)"
            >
              <el-icon :size="18" :color="statusIconColor(task.status)">
                <CircleCheckFilled v-if="task.status === 'completed'" />
                <CircleCloseFilled
                  v-else-if="task.status === 'failed' || task.status === 'cancelled'"
                />
                <Loading v-else />
              </el-icon>
            </div>

            <!-- 信息 -->
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-fg">
                  {{ task.type === "upload" ? "上传" : "下载" }}
                </span>
                <el-tag size="small" effect="plain" :type="statusTagType(task.status)">
                  {{ statusLabel(task.status) }}
                </el-tag>
              </div>

              <div class="mt-2 grid gap-1.5 text-sm">
                <div class="flex gap-2">
                  <span class="w-16 shrink-0 text-muted">项目</span>
                  <span class="truncate text-fg-2">{{ task.projectName }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="w-16 shrink-0 text-muted">版本</span>
                  <span class="font-mono text-fg-2">{{ task.version }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="w-16 shrink-0 text-muted">时间</span>
                  <span class="text-fg-2">{{ formatTime(task.startedAt) }}</span>
                </div>

                <!-- 进度 -->
                <div v-if="task.status === 'running'" class="mt-2">
                  <el-progress
                    :percentage="task.total > 0 ? Math.round((task.current / task.total) * 100) : 0"
                    :stroke-width="6"
                    class="max-w-xs"
                  />
                  <p v-if="task.currentFile" class="mt-1 truncate text-xs text-muted">
                    {{ task.currentFile }}
                  </p>
                </div>

                <!-- 错误详情 -->
                <div v-if="task.status === 'failed' && task.errorMessage" class="mt-2">
                  <div
                    class="flex items-start gap-2 rounded-md border border-danger-line bg-danger-soft px-3 py-2"
                  >
                    <el-icon :size="14" color="var(--as-danger)"><WarningFilled /></el-icon>
                    <div>
                      <p class="text-sm text-danger">
                        <span v-if="task.errorCode" class="mr-2 font-mono text-xs opacity-70"
                          >[{{ task.errorCode }}]</span
                        >
                        {{ task.errorMessage }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- 取消提示 -->
                <p v-if="task.status === 'cancelled'" class="mt-1 text-xs text-warning">
                  本地文件可能已被部分修改，请注意检查。
                </p>
              </div>
            </div>
          </div>

          <!-- 右侧操作 -->
          <div class="flex shrink-0 gap-2">
            <el-button
              v-if="task.status === 'failed'"
              type="primary"
              plain
              @click="store.retryTask(task.id)"
            >
              重试
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  CircleCheckFilled,
  CircleCloseFilled,
  Loading,
  WarningFilled,
} from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { useTaskStore } from "@renderer/stores/taskStore";

const router = useRouter();
const store = useTaskStore();

const goBack = (): void => {
  router.push({ name: "home" });
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const statusIconBg = (status: string): string => {
  switch (status) {
    case "completed":
      return "bg-success-soft";
    case "failed":
      return "bg-danger-soft";
    case "cancelled":
      return "bg-warning-soft";
    default:
      return "bg-accent-soft";
  }
};

const statusIconColor = (status: string): string => {
  switch (status) {
    case "completed":
      return "var(--as-success)";
    case "failed":
      return "var(--as-danger)";
    case "cancelled":
      return "var(--as-warning)";
    default:
      return "var(--as-accent)";
  }
};

const statusTagType = (status: string): "success" | "danger" | "warning" => {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "cancelled":
      return "warning";
    default:
      return "warning";
  }
};

const statusLabel = (status: string): string => {
  switch (status) {
    case "running":
      return "进行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    default:
      return status;
  }
};
</script>
