<template>
  <el-config-provider namespace="el">
    <div class="flex h-full flex-col bg-page">
      <!-- Header -->
      <header class="h-11 shrink-0 border-b border-line bg-page">
        <div class="mx-auto flex h-11 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div class="flex items-center gap-2.5">
            <span
              v-if="headerRole"
              class="inline-flex h-5 items-center rounded-full border border-accent-line bg-accent-soft px-2 text-[11px] leading-5 text-accent"
            >
              {{ headerRole === "developer" ? "研发" : "测试" }}
            </span>
          </div>

          <nav class="flex items-center gap-1.5">
            <el-button
              size="small"
              :plain="route.name !== 'tasks'"
              :type="route.name === 'tasks' ? 'primary' : 'default'"
              @click="goTo('tasks')"
            >
              任务中心
            </el-button>
            <el-button
              size="small"
              :plain="route.name !== 'settings'"
              :type="route.name === 'settings' ? 'primary' : 'default'"
              @click="goTo('settings')"
            >
              设置
            </el-button>
            <el-divider direction="vertical" class="mx-1" />
            <el-tooltip content="清除所有通知" placement="bottom">
              <el-button size="small" plain @click="clearNotifications">
                <el-icon><Bell /></el-icon>
              </el-button>
            </el-tooltip>
          </nav>
        </div>
      </header>

      <!-- Router content -->
      <div class="flex-1 overflow-y-auto">
        <RouterView />
      </div>
    </div>

    <!-- Setup dialog -->
    <el-dialog
      v-model="showSetup"
      :closeOnClickModal="false"
      :closeOnPressEscape="false"
      :showClose="false"
      width="440px"
      top="10vh"
    >
      <template #header>
        <div class="p-4 text-center">
          <div
            class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft text-accent"
          >
            <el-icon :size="28"><User /></el-icon>
          </div>
          <h2 class="text-lg font-semibold text-fg">欢迎使用 Artifact Sync Manager</h2>
          <p class="mt-2 text-sm text-muted">
            首次使用请先设置您的名称。此名称会在上传版本时自动记录为操作者。
          </p>
        </div>
      </template>
      <el-form @submit.prevent="handleSaveSetup">
        <el-form-item label="操作者名称" labelPosition="top">
          <el-input
            size="large"
            v-model="setupName"
            placeholder="请输入您的名称或代号"
            maxlength="50"
            clearable
            autofocus
          />
        </el-form-item>
        <el-form-item label="角色" labelPosition="top">
          <div class="grid w-full gap-3">
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition"
              :class="
                setupRole === 'developer'
                  ? 'border-accent-line bg-accent-soft'
                  : 'border-line bg-page hover:border-line-strong'
              "
            >
              <el-radio v-model="setupRole" label="developer" size="large" />
              <div>
                <p class="text-sm font-medium text-fg">研发</p>
                <p class="mt-0.5 text-sm text-muted">可上传和下载版本</p>
              </div>
            </label>
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition"
              :class="
                setupRole === 'tester'
                  ? 'border-accent-line bg-accent-soft'
                  : 'border-line bg-page hover:border-line-strong'
              "
            >
              <el-radio v-model="setupRole" label="tester" size="large" />
              <div>
                <p class="text-sm font-medium text-fg">测试</p>
                <p class="mt-0.5 text-sm text-muted">仅可下载版本，不可上传或删除版本</p>
              </div>
            </label>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-center">
          <el-button
            type="primary"
            size="large"
            :loading="saving"
            :disabled="!setupName.trim()"
            @click="handleSaveSetup"
          >
            确定，开始使用
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-config-provider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { RouterView } from "vue-router";
import { ElMessage, ElNotification } from "element-plus";
import { Bell, User } from "@element-plus/icons-vue";

const api = window.artifactSync;
const route = useRoute();
const router = useRouter();

const showSetup = ref(false);
const setupName = ref("");
const setupRole = ref<"developer" | "tester">("developer");
const headerRole = ref<"developer" | "tester" | null>(null);
const saving = ref(false);

const goTo = (name: string): void => {
  router.push({ name });
};

const clearNotifications = (): void => {
  ElNotification.closeAll();
};

const handleSaveSetup = async (): Promise<void> => {
  const trimmed = setupName.value.trim();
  if (!trimmed) return;
  saving.value = true;
  try {
    const nextState = await api.saveUserProfile({
      operatorName: trimmed,
      role: setupRole.value,
    });
    headerRole.value = nextState.settings.role;
    showSetup.value = false;
    ElMessage.success(`欢迎，${trimmed}！`);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    const state = await api.getState();
    headerRole.value = state.settings.role;
    if (!state.settings.operatorName) showSetup.value = true;
  } catch {
    showSetup.value = true;
  }
  cleanupRemoteWatch = api.onRemoteChange((events) => {
    for (const event of events) {
      const names = event.projectNames.join(", ");
      if (event.type === "version-added") {
        ElNotification({
          title: "新版本已上传",
          message: `[${names}] ${event.version} 已上传到 ${event.remoteDirectory}`,
          type: "success",
          duration: 5000,
        });
      } else {
        ElNotification({
          title: "版本已删除",
          message: `[${names}] ${event.version} 已从 ${event.remoteDirectory} 删除`,
          type: "warning",
          duration: 5000,
        });
      }
    }
  });
});

onUnmounted(() => {
  if (cleanupRemoteWatch) cleanupRemoteWatch();
});

let cleanupRemoteWatch: (() => void) | null = null;
</script>
