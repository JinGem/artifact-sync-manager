<template>
  <div
    class="group cursor-pointer rounded-lg border border-line bg-page p-4 transition-all duration-200 hover:border-accent-line hover:shadow-md"
    @click="emit('open', project.id)"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2.5">
          <h3 class="text-base font-semibold text-fg">{{ project.name }}</h3>
          <el-tag v-if="isRecent" size="small" type="primary" effect="plain"> 最近 </el-tag>
          <el-tag
            v-if="versionSummary && versionSummary.total > 10"
            size="small"
            type="warning"
            effect="plain"
          >
            版本较多 · {{ versionSummary.total }}
          </el-tag>
        </div>
        <div class="mt-4 grid gap-2.5 sm:grid-cols-3" @click.stop>
          <div
            v-if="project.remoteDirectory"
            class="group/path cursor-pointer rounded-md border border-line-soft bg-canvas px-3.5 py-2.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
            @click="emit('open-dir', project.remoteDirectory)"
          >
            <p class="text-xs text-subtle">远程目录</p>
            <p
              class="mt-1 truncate font-mono text-sm text-fg-2 transition-colors group-hover/path:text-accent"
            >
              {{ project.remoteDirectory }}
            </p>
          </div>
          <div
            v-if="project.uploadLocalPath"
            class="group/path cursor-pointer rounded-md border border-line-soft bg-canvas px-3.5 py-2.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
            @click="emit('open-dir', project.uploadLocalPath)"
          >
            <p class="text-xs text-subtle">上传路径</p>
            <p
              class="mt-1 truncate font-mono text-sm text-fg-2 transition-colors group-hover/path:text-accent"
            >
              {{ project.uploadLocalPath }}
            </p>
          </div>
          <div
            v-if="project.downloadLocalPath"
            class="group/path cursor-pointer rounded-md border border-line-soft bg-canvas px-3.5 py-2.5 transition-colors hover:border-accent-line hover:bg-accent-soft"
            @click="emit('open-dir', project.downloadLocalPath)"
          >
            <p class="text-xs text-subtle">下载路径</p>
            <p
              class="mt-1 truncate font-mono text-sm text-fg-2 transition-colors group-hover/path:text-accent"
            >
              {{ project.downloadLocalPath }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2" @click.stop>
        <el-tag v-if="hasNewerVersion" size="small" type="warning" effect="plain">
          有新版本
        </el-tag>
        <el-tag v-if="project.currentDownloadedVersion" size="small" type="info" effect="plain">
          {{ project.currentDownloadedVersion }}
        </el-tag>
        <el-button
          v-if="userRole === 'developer' && cleanupCount > 0"
          size="small"
          type="danger"
          plain
          :loading="cleaning"
          @click="emit('cleanup', project)"
        >
          清理 7 天前 · {{ cleanupCount }}
        </el-button>
        <el-button size="small" plain :icon="View" @click="emit('open', project.id)">
          详情
        </el-button>
        <el-dropdown
          trigger="click"
          @command="(command: string) => emit('action', command, project)"
        >
          <el-button size="small" plain>
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="recent" :icon="Star"> 设为最近使用 </el-dropdown-item>
              <el-dropdown-item command="delete" :icon="Delete" divided class="text-danger!">
                删除项目
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Delete, MoreFilled, Star, View } from "@element-plus/icons-vue";
import type { ProjectConfig, VersionSummary } from "@renderer/types/app";

defineProps<{
  project: ProjectConfig;
  isRecent: boolean;
  hasNewerVersion: boolean;
  versionSummary?: VersionSummary;
  userRole: "developer" | "tester";
  cleanupCount: number;
  cleaning: boolean;
}>();

const emit = defineEmits<{
  open: [projectId: string];
  "open-dir": [path: string];
  action: [command: string, project: ProjectConfig];
  cleanup: [project: ProjectConfig];
}>();
</script>
