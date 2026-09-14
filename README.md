# 版本同步助手

面向公司内网开发者的 Windows 桌面工具，用于管理项目产物的上传、下载和版本记录。应用直接访问本地路径或共享目录，无后端服务、无数据库，状态保存在本机 JSON 文件中。

## 快速开始

```sh
npm run dev          # 启动 Electron 开发环境
npm run lint         # ESLint + Prettier
npm run typecheck    # vue-tsc --noEmit
npm run build        # 图标、类型检查和生产构建
npm run verify:docs  # 文档链接、预算和决策记录格式
npm run preview      # 预览生产构建
npm run pack         # 生成 Windows NSIS 安装包
```

## 文档入口

- [产品文档](docs/产品文档.md)：用户场景、功能范围、产品边界和业务规则。
- [系统架构](docs/architecture.md)：进程模型、IPC、本地状态和远程版本结构。
- [渲染模块](src/renderer/README.md)：页面、组件、Pinia、主题和 IPC 调用。
- [工程上下文](CONTEXT.md)：技术约定、工程原则、提交与发版规则。
- [文档标准](docs/AGENTS.md)：文档层级、写作审计和校验规则。
- [决策记录](.agents/notes/README.md)：关键设计的原因、备选方案和后果。

## 当前范围

应用支持操作者资料、项目配置、版本扫描、上传、下载、删除、任务进度、配置导入导出、系统托盘和远程版本变化通知。详细行为以 [产品文档](docs/产品文档.md) 和源码为准。
