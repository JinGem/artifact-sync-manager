import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
// SCSS 源文件导入，使 @forward 变量覆盖在构建时生效
import "./styles/element/index.scss";
import "element-plus/theme-chalk/src/index.scss";

import App from "./App.vue";
import { router } from "./router";
import "./styles/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

app.mount("#app");
