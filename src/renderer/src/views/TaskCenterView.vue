<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-var(--spacing)*11)] max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10"
  >
    <!-- 头部 -->
    <div class="flex items-center gap-4">
      <el-button :icon="ArrowLeft" text @click="goBack">返回</el-button>
      <h1 class="text-2xl font-semibold text-white">任务中心</h1>
      <el-tag v-if="store.failedCount > 0" type="danger" effect="dark">
        {{ store.failedCount }} 个失败
      </el-tag>
      <el-tag v-if="store.runningCount > 0" type="warning" effect="dark">
        {{ store.runningCount }} 个进行中
      </el-tag>
    </div>

    <!-- 批量操作 -->
    <div v-if="store.tasks.length > 0" class="flex gap-3">
      <el-button
        size="small"
        plain
        class="!border-white/10 !text-slate-300 hover:!bg-white/5"
        @click="store.clearCompleted"
      >
        清除已完成
      </el-button>
      <el-button
        size="small"
        plain
        class="!border-white/10 !text-slate-300 hover:!bg-white/5"
        @click="store.clearAll"
      >
        清除全部
      </el-button>
    </div>

    <!-- 空状态 -->
    <div
      v-if="store.tasks.length === 0"
      class="rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-16 text-center text-slate-300"
    >
      暂无任务记录。执行上传或下载操作后，任务记录将在此展示。
    </div>

    <!-- 任务列表 -->
    <div v-else class="grid gap-3">
      <div
        v-for="task in store.tasks"
        :key="task.id"
        class="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-300/30"
      >
        <div class="flex items-start justify-between gap-4">
          <!-- 左侧：图标 + 信息 -->
          <div class="flex items-start gap-4 min-w-0 flex-1">
            <!-- 状态图标 -->
            <div
              class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
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
                <span class="text-sm font-medium text-white capitalize">{{
                  task.type === "upload" ? "上传" : "下载"
                }}</span>
                <el-tag size="small" :type="statusTag(task.status)" effect="dark">
                  {{ statusLabel(task.status) }}
                </el-tag>
              </div>

              <div class="mt-2 grid gap-1.5 text-sm">
                <div class="flex gap-2">
                  <span class="text-slate-400 shrink-0 w-16">项目</span>
                  <span class="text-slate-200 truncate">{{ task.projectName }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="text-slate-400 shrink-0 w-16">版本</span>
                  <span class="text-slate-200 font-mono">{{ task.version }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="text-slate-400 shrink-0 w-16">时间</span>
                  <span class="text-slate-200">{{ formatTime(task.startedAt) }}</span>
                </div>

                <!-- 进度 -->
                <div v-if="task.status === 'running'" class="mt-2">
                  <el-progress
                    :percentage="task.total > 0 ? Math.round((task.current / task.total) * 100) : 0"
                    :stroke-width="6"
                    class="max-w-xs"
                  />
                  <p v-if="task.currentFile" class="mt-1 text-xs text-slate-500 truncate">
                    {{ task.currentFile }}
                  </p>
                </div>

                <!-- 错误详情 -->
                <div v-if="task.status === 'failed' && task.errorMessage" class="mt-2">
                  <div
                    class="flex items-start gap-2 rounded-xl bg-red-950/20 border border-red-400/20 px-3 py-2"
                  >
                    <el-icon :size="14" color="#f87171"><WarningFilled /></el-icon>
                    <div>
                      <p class="text-sm text-red-300">
                        <span v-if="task.errorCode" class="font-mono text-xs opacity-70 mr-2"
                          >[{{ task.errorCode }}]</span
                        >
                        {{ task.errorMessage }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- 取消提示 -->
                <p v-if="task.status === 'cancelled'" class="mt-1 text-xs text-amber-400">
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
              size="small"
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
      return "bg-emerald-900/40";
    case "failed":
      return "bg-red-900/40";
    case "cancelled":
      return "bg-amber-900/40";
    default:
      return "bg-cyan-900/40";
  }
};

const statusIconColor = (status: string): string => {
  switch (status) {
    case "completed":
      return "#34d399";
    case "failed":
      return "#f87171";
    case "cancelled":
      return "#fbbf24";
    default:
      return "#67e8f9";
  }
};

const statusTag = (status: string): "success" | "danger" | "warning" | "info" => {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "cancelled":
      return "warning";
    default:
      return "info";
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
