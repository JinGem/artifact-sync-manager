import { createRouter, createWebHashHistory } from "vue-router";

import HomeView from "@renderer/views/HomeView.vue";
import ProjectDetailView from "@renderer/views/ProjectDetailView.vue";
import TaskCenterView from "@renderer/views/TaskCenterView.vue";
import SettingsView from "@renderer/views/SettingsView.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/project/:projectId",
      name: "project-detail",
      component: ProjectDetailView,
    },
    {
      path: "/tasks",
      name: "tasks",
      component: TaskCenterView,
    },
    {
      path: "/settings",
      name: "settings",
      component: SettingsView,
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});
