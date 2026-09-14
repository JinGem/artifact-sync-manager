<template>
  <el-dialog
    :modelValue="visible"
    width="460px"
    @update:model-value="emit('update:visible', $event)"
    @closed="handleClosed"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <span
          class="h-3.5 w-3.5 rounded-full ring-4 ring-accent-soft"
          :style="{ backgroundColor: color }"
        />
        <span class="text-lg font-semibold text-fg">{{ group ? "编辑组" : "新建组" }}</span>
      </div>
    </template>

    <el-form labelPosition="top" @submit.prevent="handleSave">
      <el-form-item label="组名称">
        <el-input
          v-model="name"
          placeholder="例如：客户端 / 服务端 / 测试环境"
          maxlength="40"
          clearable
        />
      </el-form-item>

      <el-form-item label="识别颜色">
        <div class="grid w-full grid-cols-4 gap-3">
          <button
            v-for="option in GROUP_COLORS"
            :key="option.value"
            type="button"
            class="group flex h-12 items-center justify-center rounded-lg border transition"
            :class="
              color === option.value
                ? 'border-line-strong bg-canvas-2'
                : 'border-line bg-page hover:bg-canvas'
            "
            :aria-label="`选择${option.label}`"
            :title="option.label"
            @click="color = option.value"
          >
            <span
              class="h-5 w-5 rounded-full transition-transform group-hover:scale-110"
              :class="color === option.value ? 'ring-2 ring-fg ring-offset-2' : ''"
              :style="{ backgroundColor: option.value }"
            />
          </button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          {{ group ? "保存修改" : "创建组" }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { DEFAULT_GROUP_COLOR, GROUP_COLORS } from "@shared/group-colors";
import type { AppState, ProjectGroup } from "@renderer/types/app";

const props = defineProps<{
  visible: boolean;
  group?: ProjectGroup | null;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  saved: [state: AppState];
}>();

const api = window.artifactSync;
const name = ref("");
const color = ref<string>(DEFAULT_GROUP_COLOR);
const saving = ref(false);

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return;
    name.value = props.group?.name ?? "";
    color.value = props.group?.color ?? DEFAULT_GROUP_COLOR;
  },
);

const handleSave = async (): Promise<void> => {
  const trimmed = name.value.trim();
  if (!trimmed) {
    ElMessage.warning("组名称不能为空。");
    return;
  }

  saving.value = true;
  try {
    const nextState = await api.saveGroup({
      id: props.group?.id,
      name: trimmed,
      color: color.value,
    });
    emit("saved", nextState);
    emit("update:visible", false);
    ElMessage.success(props.group ? "组已更新。" : "组已创建。");
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

const handleClosed = (): void => {
  name.value = "";
  color.value = DEFAULT_GROUP_COLOR;
};
</script>
