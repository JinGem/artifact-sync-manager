<template>
  <el-config-provider namespace="el" :dialog="{ alignCenter: true }">
    <div class="flex h-full flex-col bg-page">
      <!-- 自定义窗口 Header（含窗口控制） -->
      <WindowHeader />

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
    >
      <template #header>
        <div class="p-4 text-center">
          <div
            class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft text-accent"
          >
            <el-icon :size="28"><User /></el-icon>
          </div>
          <h2 class="text-lg font-semibold text-fg">欢迎使用 版本同步助手</h2>
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
import { RouterView } from "vue-router";
import { ElMessage } from "element-plus";
import { User } from "@element-plus/icons-vue";
import WindowHeader from "@renderer/components/WindowHeader.vue";
import { showInAppNotification } from "@renderer/services/notification";

const api = window.artifactSync;

const showSetup = ref(false);
const setupName = ref("");
const setupRole = ref<"developer" | "tester">("developer");
const saving = ref(false);

const handleSaveSetup = async (): Promise<void> => {
  const trimmed = setupName.value.trim();
  if (!trimmed) return;
  saving.value = true;
  try {
    await api.saveUserProfile({
      operatorName: trimmed,
      role: setupRole.value,
    });
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
    if (!state.settings.operatorName) showSetup.value = true;
  } catch {
    showSetup.value = true;
  }
  cleanupRemoteWatch = api.onRemoteChange((events) => {
    for (const event of events) {
      const names = event.projectNames.join(", ");
      if (event.type === "version-added") {
        void showInAppNotification({
          title: "新版本已上传",
          message: `[${names}] ${event.version} 已上传到 ${event.remoteDirectory}`,
          type: "success",
          duration: 5000,
        });
      } else {
        void showInAppNotification({
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
