<template>
  <header
    class="window-header grid h-14 shrink-0 select-none grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-canvas"
  >
    <!-- 左：品牌（可点击回首页） -->
    <div class="flex min-w-0 items-center pl-4">
      <button
        type="button"
        class="no-drag brand-link flex min-w-0 items-center gap-2.5"
        @click="goHome"
      >
        <svg
          class="h-[26px] w-[26px] shrink-0"
          viewBox="0 0 28 28"
          role="img"
          aria-label="哆啦A梦图标"
        >
          <circle cx="14" cy="14" r="13" fill="#0099ff" />
          <ellipse cx="14" cy="16.2" rx="9.4" ry="8.2" fill="#ffffff" />
          <circle cx="10.6" cy="12.4" r="2.1" fill="#1f2328" />
          <circle cx="17.4" cy="12.4" r="2.1" fill="#1f2328" />
          <circle cx="14" cy="16.6" r="2.7" fill="#ff3b30" />
          <path
            d="M8.8 19.6c1.6 2 8.8 2 10.4 0"
            stroke="#1f2328"
            stroke-width="1.3"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
        <span class="brand-name truncate text-sm font-semibold text-fg">版本同步助手</span>
      </button>
    </div>

    <!-- 中：路由导航 -->
    <nav class="no-drag flex items-center gap-1">
      <button
        type="button"
        class="as-nav-link"
        :class="{ 'is-active': route.name === 'tasks' }"
        @click="goTo('tasks')"
      >
        <el-icon :size="16"><Memo /></el-icon>
        任务中心
      </button>
      <button
        type="button"
        class="as-nav-link"
        :class="{ 'is-active': route.name === 'settings' }"
        @click="goTo('settings')"
      >
        <el-icon :size="16"><Setting /></el-icon>
        设置
      </button>
    </nav>

    <!-- 右：通知 + 窗口控制（贴右缘） -->
    <div class="flex h-14 items-center justify-self-end">
      <div class="no-drag flex items-center gap-2">
        <el-dropdown trigger="click" @command="handleThemeCommand">
          <el-button plain aria-label="主题切换">
            <el-icon
              ><Monitor v-if="themeMode === 'system'" /><Sunny
                v-else-if="themeMode === 'light'" /><Moon v-else
            /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                command="system"
                :icon="Monitor"
                :class="themeMode === 'system' ? 'text-accent!' : ''"
              >
                跟随系统
              </el-dropdown-item>
              <el-dropdown-item
                command="light"
                :icon="Sunny"
                :class="themeMode === 'light' ? 'text-accent!' : ''"
              >
                亮色
              </el-dropdown-item>
              <el-dropdown-item
                command="dark"
                :icon="Moon"
                :class="themeMode === 'dark' ? 'text-accent!' : ''"
              >
                暗色
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-tooltip content="清除所有通知" placement="bottom">
          <el-button plain @click="clearNotifications">
            <el-icon><Bell /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      <el-divider direction="vertical" class="mx-2" />
      <div class="flex h-14 items-center">
        <button type="button" class="wc-btn" aria-label="最小化" @click="minimize">
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>
        <button
          type="button"
          class="wc-btn"
          :aria-label="isMaximized ? '还原' : '最大化'"
          @click="toggleMaximize"
        >
          <svg v-if="!isMaximized" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
          <svg v-else viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <rect
              x="0.5"
              y="2.5"
              width="7"
              height="7"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
            />
            <path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>
        <button type="button" class="wc-btn wc-close" aria-label="关闭" @click="closeWindow">
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElNotification } from "element-plus";
import { Bell, Memo, Monitor, Moon, Setting, Sunny } from "@element-plus/icons-vue";

const api = window.artifactSync;
const route = useRoute();
const router = useRouter();

const isMaximized = ref(false);
const themeMode = ref<"system" | "light" | "dark">("system");

const applyTheme = (mode: "system" | "light" | "dark"): void => {
  themeMode.value = mode;
  try {
    localStorage.setItem("theme-mode", mode);
  } catch {
    // 忽略：存储不可用时仅本次生效
  }
  document.documentElement.style.colorScheme = mode === "system" ? "light dark" : mode;
};

const handleThemeCommand = (command: string | number | object): void => {
  const mode = command as "system" | "light" | "dark";
  if (mode === "system" || mode === "light" || mode === "dark") applyTheme(mode);
};

const goHome = (): void => {
  router.push({ name: "home" });
};

const goTo = (name: string): void => {
  router.push({ name });
};

const clearNotifications = (): void => {
  ElNotification.closeAll();
};

const minimize = (): void => {
  void api.minimizeWindow();
};

const toggleMaximize = (): void => {
  void api.toggleMaximizeWindow();
};

const closeWindow = (): void => {
  void api.closeWindow();
};

let cleanupMaximized: (() => void) | null = null;

onMounted(async () => {
  let savedTheme: string | null = null;
  try {
    savedTheme = localStorage.getItem("theme-mode");
  } catch {
    // 忽略
  }
  applyTheme(savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system");

  try {
    isMaximized.value = await api.isWindowMaximized();
  } catch {
    // 忽略：最大化状态查询失败时保持默认图标
  }
  cleanupMaximized = api.onWindowMaximizedChange((maximized) => {
    isMaximized.value = maximized;
  });
});

onUnmounted(() => {
  if (cleanupMaximized) cleanupMaximized();
});
</script>

<style scoped>
.window-header {
  -webkit-app-region: drag;
}

.window-header .no-drag,
.window-header .wc-btn {
  -webkit-app-region: no-drag;
}

.brand-link {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: var(--as-radius-sm);
}

.brand-link .brand-name {
  transition: color 0.15s ease;
}

.brand-link:hover .brand-name {
  color: var(--as-accent);
}

.as-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: var(--as-radius-sm);
  background: transparent;
  color: var(--as-fg-2);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.as-nav-link:hover {
  background: var(--as-canvas-2);
  color: var(--as-fg);
}

.as-nav-link.is-active {
  background: var(--as-accent-soft);
  color: var(--as-accent);
}

.wc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--as-muted);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.wc-btn:hover {
  background: var(--as-canvas-2);
  color: var(--as-fg);
}

.wc-close:hover {
  background: var(--as-danger);
  color: #ffffff;
}
</style>
