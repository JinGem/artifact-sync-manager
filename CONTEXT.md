# AI 编码助手上下文

> 包含产品边界、业务规则、编码原则、UI 原则、开发顺序等 AI 需要知道的规则。
> 架构相关的内容见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 产品边界（不可突破）

- 纯桌面端，不引入后端服务、数据库、账号系统
- 直接访问本地路径和远程目录（共享路径形式）
- 本地配置采用 JSON 文件持久化
- 如果后续需求与以上边界冲突，必须同步更新产品文档

## 当前技术栈

Electron + Vue 3 + TypeScript + Tailwind CSS + Element Plus（SCSS 源文件导入 + 构建时变量覆盖）+ Pinia + Vue Router + electron-vite + Sass

## 新增基础设施（2026-05 迭代）

### 系统托盘
- 关闭窗口 → `hide()` 保留在托盘，不退出应用
- 托盘点击 → 显示/聚焦窗口
- 右键菜单：显示窗口、退出
- 单实例锁：二次启动聚焦已有窗口
- 托盘图标：32×32 哆啦A梦 PNG，通过 `nativeImage.createFromPath()` 加载
- 兜底：路径全失败时回退到蓝色圆形 bitmap

### 远程目录监控（WatcherService）
- `src/main/watch/directory-watcher.ts` — 服务单例 `watcherService`
- 轮询间隔 30s + `fs.watch` 通知优化（网络共享目录 `fs.watch` 可能失败，轮询兜底）
- 路径去重：相同远程目录共享一个 `WatcherEntry`，多个项目关联
- 版本快照对比：首次扫描建立基线不触发事件（`initialized` 标志）
- 检测变化后：系统级通知 (`Notification API`) + IPC 推送给渲染层

### 应用图标
- `scripts/generate-icon.cjs` — 纯 Node.js 生成哆啦A梦 PNG（无任何依赖）
- 生成 32×32 (tray-icon.png) 和 256×256 (app-icon.png) 两个尺寸
- 窗口图标 (`BrowserWindow.icon`) + 打包 exe 图标 (`electron-builder win.icon`)
- 跨环境加载：生产 (`process.resourcesPath`) / dev (`__dirname`) / 源码路径三级兜底

### 项目 CRUD 同步 Watcher
- `saveProject` IPC：更新 watcher 路径（项目编辑时先移除旧路径，再添加新路径）
- `deleteProject` IPC：移除 watcher 中对应项目和路径引用

## 业务规则

### 项目模型
- 一个项目 = 一个远程目录；上传路径和下载路径可独立配置
- 项目名称全局唯一
- 项目配置允许只配置上传路径，或只配置下载路径
- 删除项目配置不删除远程文件
- 删除版本同时删除远程目录中对应文件

### 版本与任务
- 版本号语义化（`v1.0.0`），同一项目内唯一
- 版本号自动递进：新增→minor / 修复→patch / 勾选破坏性变动→major，首次默认 `v1.0.0`
- 上传/下载规则使用 `.gitignore` 语法，上传和下载分别独立配置
- 取消上传时清理已上传内容和版本信息；取消下载时提示本地文件可能被部分修改
- 下载提供 overwrite（覆盖已有文件）和 clear（先清空再下载）两种模式
- 失败版本不留记录；成功版本不可覆盖
- `.asar` 文件复制必须使用 `process.noAsar` 包装

### 第一版明确不做
1. 独立后端服务
2. 数据库和 ORM
3. 用户登录与权限系统
4. 自动更新通知
5. 版本差异对比
6. 自动增量上传/下载
7. 文件完整性校验
8. 历史任务长期保存
9. 部分文件下载
10. 默认规则模板
11. 错误日志导出

## 开发顺序

严格按以下顺序推进，不要随意跳步骤：

1. 首次启动录入操作者名称
2. 项目配置管理
3. 版本列表浏览
4. 上传流程
5. 下载流程
6. 任务中心
7. 设置页与配置导入导出

如果某次任务跨越多个阶段，优先保证前置阶段稳定，再继续后续功能。

## 编码原则

1. 优先做小步提交，不要一口气改太多模块
2. 优先保证可读性，不要为了"高级写法"牺牲维护性
3. 新增抽象前先确认是否真的复用
4. 避免过早优化
5. 优先让功能闭环，再逐步美化或重构
6. 不要为了方便而绕开项目既定边界
7. 应用内所有版本号必须从 `package.json` 的 `version` 字段动态读取，通过构建注入（`__APP_VERSION__`）+ preload `contextBridge` 暴露给渲染层，不得在任何 UI 位置硬编码

## 提交、CI 与发版规范

- 提交信息遵循 Conventional Commits（`<type>: <summary>`，类型见 `AGENTS.md`），由 husky + commitlint + lint-staged 强制：`pre-commit` 自动格式化/检查暂存文件，`commit-msg` 校验格式，`pre-push` 运行 typecheck。
- GitHub Actions 在 push/PR 时运行 lint、typecheck、build 和 Windows 打包验证；tag `v*` 触发安装包上传 GitHub Release。
- 应用版本号由 release-please 依据提交类型自动递进并生成 `CHANGELOG.md`，`package.json` 是唯一版本来源。

## UI 与交互原则

1. 路径信息必须清晰展示
2. 上传、下载、删除、覆盖等高风险操作必须明确提示确认
3. 默认行为偏保守，避免静默覆盖
4. 表单字段命名直接，减少歧义
5. 上传路径和下载路径界面上必须明确区分

## 变更要求

- 如果变更影响产品边界，先改产品文档
- 如果变更影响协作规则或开发约定，更新本文件
- 不要悄悄引入与文档不一致的实现

## 验证要求

每次阶段性开发后执行：

```bash
npm run typecheck
npm run build
```

如果因环境原因无法运行，必须明确说明未验证项。
