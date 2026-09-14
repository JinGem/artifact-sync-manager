<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-var(--spacing)*14)] max-w-4xl flex-col gap-6 px-6 py-8 lg:px-10"
  >
    <!-- 头部 -->
    <div class="flex items-center gap-4">
      <el-button :icon="ArrowLeft" text @click="goBack">返回</el-button>
      <h1 class="text-2xl font-semibold text-fg">设置</h1>
    </div>

    <!-- 操作者名称 -->
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-base font-semibold text-fg">操作者</span>
          <el-tag size="small" effect="plain" :type="operatorName ? 'success' : 'warning'">
            {{ operatorName ? "已设置" : "未设置" }}
          </el-tag>
        </div>
      </template>

      <el-form labelPosition="top" @submit.prevent>
        <el-form-item label="名称">
          <el-input
            v-model="operatorName"
            placeholder="请输入操作者名称"
            maxlength="50"
            clearable
          />
        </el-form-item>
        <el-form-item label="角色">
          <div class="grid w-full gap-3">
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition"
              :class="
                userRole === 'developer'
                  ? 'border-accent-line bg-accent-soft'
                  : 'border-line bg-page hover:border-line-strong'
              "
            >
              <el-radio v-model="userRole" label="developer" size="large" />
              <div>
                <p class="text-sm font-medium text-fg">研发</p>
                <p class="mt-0.5 text-sm text-muted">可上传和下载版本</p>
              </div>
            </label>
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition"
              :class="
                userRole === 'tester'
                  ? 'border-accent-line bg-accent-soft'
                  : 'border-line bg-page hover:border-line-strong'
              "
            >
              <el-radio v-model="userRole" label="tester" size="large" />
              <div>
                <p class="text-sm font-medium text-fg">测试</p>
                <p class="mt-0.5 text-sm text-muted">仅可下载版本，不可上传或删除版本</p>
              </div>
            </label>
          </div>
        </el-form-item>
        <p class="mb-4 text-sm leading-6 text-muted">
          名称会在上传版本时自动记录为操作者。角色决定了可用的操作范围。
        </p>
        <el-button type="primary" :loading="saving" @click="handleSave"> 保存修改 </el-button>
      </el-form>
    </el-card>

    <!-- 通知 -->
    <el-card shadow="never">
      <template #header>
        <span class="text-base font-semibold text-fg">通知</span>
      </template>

      <div class="divide-y divide-line-soft">
        <div class="flex items-center justify-between gap-6 py-4 first:pt-0">
          <div>
            <p class="text-sm font-medium text-fg">Windows 通知</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              在系统通知中心显示远程版本变化、上传完成和版本删除提醒。
            </p>
          </div>
          <el-switch
            v-model="systemNotifications"
            :loading="savingNotifications"
            @change="handleNotificationChange"
          />
        </div>
        <div class="flex items-center justify-between gap-6 py-4 last:pb-0">
          <div>
            <p class="text-sm font-medium text-fg">应用内通知</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              在应用窗口右上角显示版本变化以及上传、下载结果。
            </p>
          </div>
          <el-switch
            v-model="inAppNotifications"
            :loading="savingNotifications"
            @change="handleNotificationChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 配置导入导出 -->
    <el-card shadow="never">
      <template #header>
        <span class="text-base font-semibold text-fg">配置管理</span>
      </template>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-md border border-line bg-canvas p-5">
          <p class="mb-1 text-sm font-medium text-fg">导出配置</p>
          <p class="mb-4 text-xs text-muted">将当前组和所有项目配置导出为 JSON 文件。</p>
          <el-button :loading="exporting" @click="handleExport"> 导出 </el-button>
        </div>
        <div class="rounded-md border border-line bg-canvas p-5">
          <p class="mb-1 text-sm font-medium text-fg">导入配置</p>
          <p class="mb-4 text-xs text-muted">从 JSON 文件导入组和项目配置，同名项目会跳过。</p>
          <el-button :loading="importing" @click="handleImport"> 导入 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 危险操作 -->
    <el-card
      shadow="never"
      style="border-color: var(--as-danger-line); background: var(--as-danger-soft)"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-base font-semibold text-fg">危险操作</span>
          <el-tag size="small" type="danger" effect="plain"> 谨慎 </el-tag>
        </div>
      </template>

      <div class="rounded-md border border-danger-line bg-danger-soft p-5">
        <p class="mb-1 text-sm font-medium text-danger">重置所有数据</p>
        <p class="mb-4 text-xs text-muted">
          清除操作者名称、所有项目配置和本地缓存状态，应用恢复到首次启动状态。此操作不可撤销。
        </p>
        <el-button type="danger" :loading="resetting" @click="handleReset">
          重置所有数据
        </el-button>
      </div>
    </el-card>

    <!-- 关于 -->
    <el-card shadow="never">
      <template #header>
        <span class="text-base font-semibold text-fg">关于</span>
      </template>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-md border border-line p-4">
          <p class="text-xs text-muted">应用名称</p>
          <p class="mt-2 text-sm font-medium text-fg">{{ appName }}</p>
        </div>
        <div class="rounded-md border border-line p-4">
          <p class="text-xs text-muted">当前版本</p>
          <p class="mt-2 text-sm font-medium text-fg">{{ appVersion }}</p>
        </div>
        <div class="rounded-md border border-line p-4">
          <p class="text-xs text-muted">技术栈</p>
          <p class="mt-2 text-sm text-fg-2">Electron + Vue 3 + TypeScript</p>
        </div>
      </div>
    </el-card>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";

const api = window.artifactSync;
const router = useRouter();

const appName = api.appName;
const appVersion = api.version;
const operatorName = ref("");
const userRole = ref<"developer" | "tester">("developer");
const saving = ref(false);
const exporting = ref(false);
const importing = ref(false);
const resetting = ref(false);
const systemNotifications = ref(true);
const inAppNotifications = ref(true);
const savingNotifications = ref(false);

const goBack = (): void => {
  router.push({ name: "home" });
};

const loadOperatorName = async (): Promise<void> => {
  const state = await api.getState();
  operatorName.value = state.settings.operatorName;
  userRole.value = state.settings.role;
  systemNotifications.value = state.settings.notifications.system;
  inAppNotifications.value = state.settings.notifications.inApp;
};

const handleNotificationChange = async (): Promise<void> => {
  savingNotifications.value = true;
  try {
    const nextState = await api.saveNotificationSettings({
      system: systemNotifications.value,
      inApp: inAppNotifications.value,
    });
    systemNotifications.value = nextState.settings.notifications.system;
    inAppNotifications.value = nextState.settings.notifications.inApp;
    ElMessage.success("通知设置已保存。");
  } catch (error) {
    ElMessage.error(`保存通知设置失败：${(error as Error).message}`);
  } finally {
    savingNotifications.value = false;
  }
};

const handleSave = async (): Promise<void> => {
  saving.value = true;

  try {
    await api.saveUserProfile({ operatorName: operatorName.value, role: userRole.value });
    ElMessage.success("操作者信息已保存。");
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

const handleExport = async (): Promise<void> => {
  exporting.value = true;

  try {
    const path = await api.exportConfig();

    if (path) {
      ElMessage.success(`配置已导出到：${path}`);
    }
  } catch (error) {
    ElMessage.error(`导出失败：${(error as Error).message}`);
  } finally {
    exporting.value = false;
  }
};

const handleImport = async (): Promise<void> => {
  importing.value = true;

  try {
    const result = await api.importConfig();

    if (result) {
      operatorName.value = result.state.settings.operatorName;

      const parts: string[] = [];
      if (result.created > 0) parts.push(`新增 ${result.created} 个`);
      if (result.skipped > 0) parts.push(`忽略 ${result.skipped} 个（同名）`);
      if (result.error > 0) parts.push(`异常 ${result.error} 个`);

      if (result.created === 0 && result.skipped === 0 && result.error === 0) {
        ElMessage.info("导入文件中没有找到项目配置。");
      } else {
        ElMessageBox.alert(parts.join("，"), "导入结果", {
          confirmButtonText: "知道了",
          type: result.error > 0 ? "warning" : "success",
        });
      }
    }
  } catch (error) {
    ElMessage.error(`导入失败：${(error as Error).message}`);
  } finally {
    importing.value = false;
  }
};

onMounted(() => {
  loadOperatorName();
});

const handleReset = async (): Promise<void> => {
  try {
    await ElMessageBox.confirm(
      "此操作将清除操作者名称、所有项目配置和本地缓存状态，应用恢复到首次启动状态。\n\n此操作不可撤销，确认继续吗？",
      "重置所有数据",
      {
        confirmButtonText: "确认重置",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return;
  }

  resetting.value = true;

  try {
    await api.resetState();
    ElMessage.success("所有数据已重置。应用即将重新加载。");
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  } catch (error) {
    ElMessage.error(`重置失败：${(error as Error).message}`);
    resetting.value = false;
  }
};
</script>
