# AGENT.md - 项目工作指南

## 1. 项目目标

**Offline Desktop BI** 是一个面向非技术用户的离线数据分析桌面应用，核心价值：

- 离线优先：无网络环境下完整数据分析能力
- 数据安全：本地处理，用户数据不外泄
- 简单易用：零学习成本，即装即用

目标：支持百万行数据处理，拖拽生成图表，商业交付级别。

## 2. 架构方向

### 技术栈
- 前端: Tauri 2 + React 19 + TypeScript + Vite 7
- 后端: Rust (analytics-core, metadata-store)
- 包管理: pnpm (workspace) + Cargo (workspace)
- 数据处理: DuckDB + Polars (当前因版本冲突未启用)
- 状态管理: Zustand + React Query
- 可视化: ECharts

### 目录结构
```
下面是一份适合离线桌面版首发产品的 monorepo 目录树。它保留了前端工程效率，同时把分析内核、元数据、连接器和导出模块拆为可测试的 Rust crates。

```text
smb-bi-desktop/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── app/
│       │   ├── pages/
│       │   ├── features/
│       │   │   ├── dataset-import/
│       │   │   ├── field-pane/
│       │   │   ├── chart-builder/
│       │   │   ├── dashboard-editor/
│       │   │   └── filter-bar/
│       │   ├── widgets/
│       │   ├── entities/
│       │   ├── shared/
│       │   │   ├── api/
│       │   │   ├── charts/
│       │   │   ├── dnd/
│       │   │   ├── ui/
│       │   │   └── lib/
│       │   └── main.tsx
│       ├── src-tauri/
│       │   ├── src/
│       │   │   ├── main.rs
│       │   │   ├── commands/
│       │   │   ├── app_state/
│       │   │   ├── bootstrap/
│       │   │   ├── services/
│       │   │   └── security/
│       │   ├── capabilities/
│       │   ├── icons/
│       │   ├── tauri.conf.json
│       │   └── Cargo.toml
├── crates/
│   ├── analytics-core/
│   │   └── src/
│   │       ├── dataset_io/
│   │       ├── profiling/
│   │       ├── semantic/
│   │       ├── planner/
│   │       ├── executor/
│   │       ├── suggestions/
│   │       └── chart_specs/
│   ├── metadata-store/
│   │   └── src/
│   ├── connectors/
│   │   └── src/
│   ├── export-runtime/
│   │   └── src/
│   ├── job-runner/
│   │   └── src/
│   └── telemetry/
│       └── src/
├── packages/
│   ├── ui-kit/
│   ├── chart-presets/
│   └── ts-contracts/
├── docs/
│   ├── adr/
│   ├── api/
│   ├── product/
│   └── runbooks/
├── scripts/
│   ├── dev/
│   ├── packaging/
│   └── data/
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── e2e/
├── .github/workflows/
├── Cargo.toml
├── package.json
├── pnpm-workspace.yaml
├── rust-toolchain.toml
├── .env.example
└── README.md
```
| 路径 | 存放内容 / 职责 |
|---|---|
| `apps/desktop/src/app` | 桌面前端的启动装配、路由、全局 provider 与窗口级布局。 |
| `apps/desktop/src/features` | 按业务能力拆分的前端功能模块，例如导入、拖拽建图、仪表板编辑与筛选联动。 |
| `apps/desktop/src/entities` | `dataset`、`field`、`chart`、`dashboard` 等前端领域实体与类型别名。 |
| `apps/desktop/src/shared` | 跨页面复用的 UI、ECharts 适配、拖拽封装、通用工具函数。 |
| `apps/desktop/src-tauri/src/commands` | 前端可调用的 Tauri 命令边界；只暴露受控的本地能力。 |
| `apps/desktop/src-tauri/src/app_state` | 应用级状态、工作区句柄、任务状态、缓存索引与资源引用。 |
| `apps/desktop/src-tauri/src/bootstrap` | 应用启动、目录初始化、数据库迁移、日志与配置加载。 |
| `apps/desktop/src-tauri/src/security` | 文件访问、命令白名单、权限策略、签名与安全相关配置。 |
| `crates/analytics-core` | 分析内核；负责导入标准化、字段 profiling、语义模型、查询规划和执行。 |
| `crates/metadata-store` | SQLite 访问层；保存工作区配置、数据集元数据、图表 spec 与布局定义。 |
| `crates/connectors` | CSV、Excel、Parquet、本地 DB 快照等连接器及其解析逻辑。 |
| `crates/export-runtime` | CSV / XLSX / PDF 等本地导出能力，以及快照导出编排。 |
| `crates/job-runner` | 后台任务调度，处理导入、profile、缓存预热、导出与取消。 |
| `crates/telemetry` | 本地日志、错误事件、性能指标采样与调试开关。 |
| `packages/ui-kit` | 复用的视觉组件、主题 token、表单与面板样式。 |
| `packages/chart-presets` | 统一图表模板、字段映射规则、默认格式化与交互 preset。 |
| `packages/ts-contracts` | 前端共享的 TypeScript 契约类型，如 `SemanticQuery` 与 `ChartSpec`。 |
| `docs/adr` | 架构决策记录；用于沉淀为什么选 Tauri、DuckDB、SQLite 等关键决策。 |
| `tests` | 夹具数据、Rust 集成测试、前端端到端测试和关键性能回归测试。 |


## 3. 强制约束

- 每次 commit 必须使用有意义的提交信息
- 所有代码使用英文（注释、变量名）
- 所有业务逻辑通过 Tauri command 暴露给前端
- 使用 pnpm workspace 管理前端多包
- 使用 Cargo workspace 管理 Rust 多包
- 禁止在生产代码中使用 `any` 类型

## 4. 禁止事项

- 禁止添加未记录的外部依赖
- 禁止直接 push 到 main 分支（必须通过 PR）
- 禁止提交带 `TODO` 注释的生产代码
- 禁止跳过 lint 检查
- 禁止直接在代码中拼接 SQL

## 5. 每轮工作流程

1. 从 TASKS.json 或 TODO_NOW.md 选择任务
2. 先明确 acceptance 条件
3. 实现代码
4. 提交（每 commit 一个独立改动）
5. 更新 PROGRESS.md 记录进度
6. 满足 acceptance 后标记 task 为 done

## 6. 文件更新要求

每轮结束必须更新（如有变更）：
- `PROGRESS.md` - 更新完成的任务状态
- `TASKS.json` - 更新任务状态、添加新任务
- `TODO_NOW.md` - 如有更高优先级任务则更新
- `DECISIONS.md` - 如有新决策则添加
- `RISKS.md` - 如有新风险则添加

## 7. 任务完成标准

任务标记为 `done` 必须满足：
- [ ] 代码实现完成
- [ ] 测试通过（或有明确 test evidence）
- [ ] 代码审查通过
- [ ] 满足 `acceptance` 条件
- [ ] 已更新 PROGRESS.md

## 8. 分支策略

- `main`: 稳定可发布分支
- `feature/*`: 功能开发分支
- `fix/*`: bugfix 分支
前端 UI 与交互规范

- 组件库：强制使用 **shadcn/ui**（基于 Radix UI）+ **Tailwind CSS**。
- 异步数据：统一使用 **TanStack Query** 封装 Tauri Command 调用。
- 全局 UI：使用 **Zustand** 存储当前选中的工作区 ID、侧边栏折叠状态等轻量级信息。
- 图表渲染：使用 **echarts-for-react**。
- 必须在组件销毁时显式调用 `dispose()` 释放 Canvas 资源，防止离线长期运行导致的内存溢出。

### 8. 离线数据缓存策略

- 导入流程：原始文件（CSV / Excel） -> `connectors` 解析 -> 转存为 `workspace/cache/{dataset_id}.parquet`
- 查询路径：前端请求 -> `analytics-core` 读取 Parquet 缓存 -> DuckDB 执行聚合 -> 返回 JSON 结果给前端
- 元数据隔离：SQLite 仅存储 Parquet 文件路径、字段别名和仪表板配置，不存储原始业务数据

所有 PR 必须通过 CI 检查并经过 code review 才能合并。