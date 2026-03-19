# 离线桌面版 BI 架构建议

- 日期：2026-03-14
- 推荐主方案：**Tauri 2 + React + Rust + DuckDB + Polars + ECharts**
- 主题：离线桌面版商业数据分析工具
- 面向对象：中小企业

## 结论

若目标是一个**可安装、可离线、可处理至少一百万行数据**，且支持**拖拽生成图表**的商业桌面产品，主方案应采用 **Rust-first** 的桌面架构：

- **Tauri** 负责壳层与原生能力
- **DuckDB** 与 **Polars** 负责本地分析执行
- **React + TypeScript + ECharts** 负责交互式可视化

这样能减少部署复杂度，同时保留现代 Web 交互体验。

## 适用场景

- 中小企业内部离线分析
- 单机安装交付
- 弱网或内网环境

## 设计目标

- 百万行起步的数据集处理能力
- 秒级到可接受范围内的交互延迟
- 支持拖拽生成图表与仪表板

## 建议边界

- 首发版本优先支持：**单机 / 单工作区**
- 核心功能：**不依赖常驻云服务**

---

## 1. 项目目的

这个项目的目标不是做一个迷你版大数据平台，而是做一个**可商业化交付的离线桌面分析工具**。用户在本机导入 CSV、Excel、Parquet 或数据库导出的快照文件后，可以完成：

- 字段识别
- 维度 / 度量编排
- 拖拽生成图表
- 保存仪表板
- 导出分析结果

产品定位是：**本地优先、安装即可用、对中小团队友好**。

因此，架构重点不是微服务和分布式，而是：

- 本地执行性能
- 安装包稳定性
- 数据安全边界
- 语义查询抽象
- 后续功能扩展的可维护性

### 核心能力

- 本地导入
- 字段语义识别
- 即席分析
- 拖拽建图
- 仪表板保存
- 离线导出

### 性能目标

设计上以**一百万行数据**为最低目标；真实上限取决于：

- 列数
- 字段类型
- 聚合复杂度
- 磁盘速度
- 内存

### 部署目标

- Windows / macOS 优先
- Linux 作为次优兼容目标

---

## 2. 主方案技术栈

| 层 | 选型 | 为什么这样选 |
|---|---|---|
| 桌面壳 | Tauri 2 | 基于系统原生 WebView 打包桌面应用；适合本地安装与较小体积交付。 |
| 桌面核心 | Rust + Tokio | 负责命令调度、文件系统访问、任务编排、权限边界与本地状态管理。 |
| 分析执行 | DuckDB + Polars | DuckDB 处理 SQL / 聚合 / Parquet 扫描；Polars 负责 profile、表达式计算与批式执行。 |
| 列式中间层 | Arrow + Parquet | 导入后统一转列式格式，便于过滤下推、列裁剪与缓存复用。 |
| 前端 | React + TypeScript + Vite | 保留高效的 UI 研发体验，适合拖拽式分析界面与组件复用。 |
| 状态管理 | TanStack Query + Zustand | 前者管理异步查询状态，后者管理工作区、面板与编辑态。 |
| 拖拽交互 | dnd-kit | 构建字段面板、axis shelf、filter shelf 与 dashboard 布局拖拽。 |
| 图表引擎 | Apache ECharts | 图表类型丰富、交互成熟，适合仪表板和业务分析视图。 |
| 元数据 | SQLite | 保存工作区配置、数据集清单、字段语义、图表定义与仪表板布局。 |
| 测试与工程化 | Cargo workspace + pnpm workspace + Vitest + Playwright | 保持桌面核心与前端界面分层，便于持续集成与回归测试。 |

### 备选方案

如果团队强依赖 Python 数据栈，可以把 `analytics-core` 替换成 **Python sidecar**（DuckDB + Polars + PyArrow），由 Tauri 以 sidecar 方式捆绑。

但对于离线商业桌面产品，仍更推荐**单进程或少进程的 Rust-first 主方案**，因为安装、签名、升级和跨平台打包都更简单。

---

## 3. 架构原则

```text
文件导入 / 数据库快照
↓
Schema 推断 + Profiling + 语义识别
↓
标准化为本地 Parquet / 工作区缓存
↓
前端拖拽 -> SemanticQuery / ChartSpec
↓
Planner 编译 -> DuckDB / Polars 执行
↓
只返回聚合结果 / 采样预览 -> ECharts / Grid
```

### 关键原则

- 前端拖拽产生的是**语义查询与图表定义**，而不是 SQL 字符串。
- 本地 WebView **不加载全量数据**；表格预览采用分页、采样与虚拟滚动；图表只取聚合结果。
- **导入路径与分析路径解耦**：原始文件用于留档，分析统一走 Parquet 缓存层。

---

## 4. 项目初始化目录树

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

---

## 5. 核心文件夹职责说明

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

---

## 6. 规则约束（必须一开始就定下来）

1. **单机离线优先**：首发版本的核心分析、建图、保存与导出能力，不依赖外网或常驻后端服务。
2. **导入后统一标准化**：CSV / Excel 等源文件导入后必须转成 Parquet；原始文件仅用于审计、回放与重新导入。
3. **语义层先于图表层**：前端拖拽只生成 `SemanticQuery` / `ChartSpec`；前端禁止直接拼接 SQL。
4. **前端只拿结果不拿全表**：表格预览采用分页、采样、虚拟滚动；图表接口只返回聚合结果和必要的维度标签。
5. **元数据与分析数据分离**：SQLite 管工作区、图表、布局与配置；DuckDB / Parquet 管分析数据与查询执行。
6. **分析路径必须可取消**：长查询、导入、导出都要有取消、超时、内存上限与临时文件清理机制。
7. **权限最小化**：桌面壳只能访问用户显式选择的文件与工作区目录；禁止偷偷全盘扫描。
8. **安全边界收口在命令层**：前端只能通过 Tauri command / capability 白名单访问本地能力。
9. **首发保持模块化单体**：不要在离线桌面版第一阶段引入微服务、分布式调度或远程缓存。
10. **性能优化顺序固定**：先列式缓存、再查询计划、再虚拟滚动，最后才考虑更重的并行和更复杂的缓存。

---

## 7. 一句话判断

### 推荐结论

离线桌面版不应简单把 Web 服务端搬到本机运行，而应围绕：

- 嵌入式元数据
- 本地列式分析
- 语义查询
- WebView 交互层

重新设计。

按这个原则，**Tauri 2 + React + Rust + DuckDB + Polars + SQLite** 是更稳、更适合商业交付的一线方案。

---

## 8. 补充技术契约与规范

### 8.1 语义查询协议（SemanticQuery Spec）

前端拖拽操作不直接生成 SQL，而是生成如下 JSON / TypeScript 结构，由 `analytics-core` 解析执行：

```ts
// 存放于 packages/ts-contracts/index.ts
export interface SemanticQuery {
  datasetId: string;

  // 维度：用于 Group By
  dimensions: Array<{
    column: string;
    alias?: string;
    grain?: 'year' | 'month' | 'day' | 'hour'; // 仅针对时间字段
  }>;

  // 度量：用于聚合计算
  metrics: Array<{
    column: string;
    aggregation: 'sum' | 'avg' | 'count' | 'distinct_count' | 'max' | 'min';
    alias: string;
  }>;

  // 过滤条件
  filters: Array<{
    column: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';
    value: any;
  }>;

  limit?: number;
}
```

### 8.2 统一错误处理枚举（Rust AppError）

为了确保 Tauri 报错在前端可读，后端需统一错误模型：

```rust
// 存放于 apps/desktop/src-tauri/src/services/error.rs
#[derive(Debug, serde::Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    IoError(String),
    DatabaseError(String), // SQLite 或 DuckDB 错误
    AnalysisError(String), // Polars 计算错误
    InvalidQuery(String),  // 语义校验未通过
    SecurityViolation(String), // 越权访问文件
}

pub type AppResult<T> = Result<T, AppError>;
```

### 8.3 前端 UI 与交互规范

- 组件库：强制使用 **shadcn/ui**（基于 Radix UI）+ **Tailwind CSS**。
- 异步数据：统一使用 **TanStack Query** 封装 Tauri Command 调用。
- 全局 UI：使用 **Zustand** 存储当前选中的工作区 ID、侧边栏折叠状态等轻量级信息。
- 图表渲染：使用 **echarts-for-react**。
- 必须在组件销毁时显式调用 `dispose()` 释放 Canvas 资源，防止离线长期运行导致的内存溢出。

### 8.4 离线数据缓存策略

- 导入流程：原始文件（CSV / Excel） -> `connectors` 解析 -> 转存为 `workspace/cache/{dataset_id}.parquet`
- 查询路径：前端请求 -> `analytics-core` 读取 Parquet 缓存 -> DuckDB 执行聚合 -> 返回 JSON 结果给前端
- 元数据隔离：SQLite 仅存储 Parquet 文件路径、字段别名和仪表板配置，不存储原始业务数据

---

## 附：选型依据（官方资料）

- **Tauri 2** 官方文档：支持任意前端框架、跨平台桌面构建，以及从前端调用 Rust 命令；也支持 sidecar 方式打包外部二进制。
- **DuckDB** 官方文档：支持 larger-than-memory / out-of-core 处理；对 Parquet 提供过滤下推与列裁剪。
- **Polars** 官方文档：`LazyFrame` 是首选高性能模式；`Streaming` 可分批执行不适合完全放入内存的数据。
- **Apache ECharts** 官方文档：支持 Canvas / SVG 两种渲染器；在大量图形元素和较多交互场景下优先考虑 Canvas。

---

## 备注

这份 Markdown 是根据上传 PDF 的可解析文本整理而成。为了保证可读性，我做了以下清理：

- 重建了标题层级
- 把技术选型整理成表格
- 把目录树整理为代码块
- 把 `SemanticQuery` 与 `AppError` 重组为可读代码块
- 去除了分页噪声和部分 PDF 断行

原始 PDF 来源：`offline_desktop_bi_architecture.pdf`
