<template>
  <el-dialog
    :modelValue="visible"
    width="640px"
    @update:model-value="emit('update:visible', $event)"
    @closed="handleClosed"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/40">
          <el-icon :size="18" color="#34d399">
            <EditPen v-if="editingProjectId" />
            <Plus v-else />
          </el-icon>
        </div>
        <span class="text-lg font-semibold text-white">{{
          editingProjectId ? "编辑项目配置" : "新建项目配置"
        }}</span>
      </div>
    </template>
    <el-form labelPosition="top" @submit.prevent="handleSave">
      <div class="grid gap-4 md:grid-cols-2">
        <el-form-item label="项目名称" class="md:col-span-2">
          <el-input v-model="form.name" placeholder="例如：demo-app" maxlength="80" clearable />
        </el-form-item>

        <el-form-item label="远程目录" class="md:col-span-2">
          <div class="flex w-full gap-3">
            <el-input
              v-model="form.remoteDirectory"
              placeholder="例如：\\\\192.168.1.88\\home\\projects"
              class="flex-1"
            />
            <el-button @click="fillDirectory('remoteDirectory')">选择目录</el-button>
          </div>
        </el-form-item>

        <el-form-item label="上传本地路径">
          <div class="flex w-full gap-3">
            <el-input
              v-model="form.uploadLocalPath"
              placeholder="可选，仅上传者需要配置"
              class="flex-1"
            />
            <el-button @click="fillDirectory('uploadLocalPath')">选择目录</el-button>
          </div>
        </el-form-item>

        <el-form-item label="下载本地路径">
          <div class="flex w-full gap-3">
            <el-input
              v-model="form.downloadLocalPath"
              placeholder="可选，仅下载者需要配置"
              class="flex-1"
            />
            <el-button @click="fillDirectory('downloadLocalPath')">选择目录</el-button>
          </div>
        </el-form-item>

        <el-form-item label="上传规则" class="md:col-span-2">
          <el-input
            v-model="form.uploadRules"
            type="textarea"
            :rows="3"
            placeholder="使用 .gitignore 风格规则，例如：dist/"
          />
        </el-form-item>

        <el-form-item label="下载规则" class="md:col-span-2">
          <el-input
            v-model="form.downloadRules"
            type="textarea"
            :rows="3"
            placeholder="使用 .gitignore 风格规则，例如：*.log"
          />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <el-button @click="emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          {{ editingProjectId ? "保存修改" : "创建项目" }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { EditPen, Plus } from "@element-plus/icons-vue";
import type { AppState, ProjectConfig, ProjectDraft } from "@renderer/types/app";

const props = defineProps<{
  visible: boolean;
  project?: ProjectConfig | null;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  saved: [state: AppState];
}>();

const api = window.artifactSync;
const saving = ref(false);
const editingProjectId = ref<string | null>(null);

const defaultForm = (): ProjectDraft => ({
  name: "",
  remoteDirectory: "",
  uploadLocalPath: "",
  downloadLocalPath: "",
  uploadRules: "",
  downloadRules: "",
});

const form = reactive<ProjectDraft>(defaultForm());

// --- 草稿保存 (F2) ---
const DRAFT_KEY = () => (props.project ? `draft:project:${props.project.id}` : "draft:project:new");

const saveDraft = (): void => {
  try {
    localStorage.setItem(DRAFT_KEY(), JSON.stringify({ ...form }));
  } catch {
    /* 忽略 */
  }
};

const loadDraft = (): void => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY());
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (typeof draft === "object" && draft.name !== undefined) {
      Object.assign(form, draft);
    }
  } catch {
    /* 忽略 */
  }
};

const clearDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY());
  } catch {
    /* 忽略 */
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.project) {
        editingProjectId.value = props.project.id;
        Object.assign(form, {
          name: props.project.name,
          remoteDirectory: props.project.remoteDirectory,
          uploadLocalPath: props.project.uploadLocalPath,
          downloadLocalPath: props.project.downloadLocalPath,
          uploadRules: props.project.uploadRules,
          downloadRules: props.project.downloadRules,
        });
      } else {
        editingProjectId.value = null;
        Object.assign(form, defaultForm());
        loadDraft();
      }
    }
  },
);

watch(
  () => ({ ...form }),
  () => {
    if (props.visible && !props.project) saveDraft();
  },
  { deep: true },
);

const handleClosed = (): void => {
  Object.assign(form, defaultForm());
  editingProjectId.value = null;
};

const handleSave = async (): Promise<void> => {
  if (!form.name.trim()) {
    ElMessage.warning("项目名称不能为空。");
    return;
  }
  if (!form.remoteDirectory.trim()) {
    ElMessage.warning("远程目录不能为空。");
    return;
  }

  saving.value = true;
  try {
    const nextState = await api.saveProject({
      ...form,
      id: editingProjectId.value ?? undefined,
    });
    clearDraft();
    emit("saved", nextState);
    emit("update:visible", false);
    ElMessage.success(editingProjectId.value ? "项目已更新。" : "项目已创建。");
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

const fillDirectory = async (
  field: "remoteDirectory" | "uploadLocalPath" | "downloadLocalPath",
): Promise<void> => {
  const path = await api.chooseDirectory();
  if (path) {
    form[field] = path;
  }
};
</script>
