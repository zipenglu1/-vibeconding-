import type { AppLanguage } from "./appLanguage";

type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

interface WorkbenchCopy {
  hero: {
    eyebrow: string;
    dashboardTitle: string;
    workspaceTitle: string;
    dashboardDescription: string;
    workspaceDescription: string;
    workspaceButton: string;
    dashboardButton: string;
    languageLabel: string;
    languageEnglish: string;
    languageChinese: string;
  };
  datasetImport: {
    dataSourcesTitle: string;
    noDataSources: string;
    dataSourceTitle: string;
    dataSourceMetaFile: string;
    detailName: string;
    detailPath: string;
    detailRows: string;
    datasetImportTitle: string;
    datasetImportMeta: string;
    localFilePath: string;
    localFilePathPlaceholder: string;
    chooseFile: string;
    opening: string;
    loadFile: string;
    loading: string;
    helperText: string;
    previewTitle: string;
    previewRows: string;
  };
  fieldPane: {
    none: string;
    title: string;
    description: string;
    columns: string;
    dimensionSlot: string;
    dimensionSlotHelper: string;
    measureSlot: string;
    measureSlotHelper: string;
    queryName: string;
    queryNamePlaceholder: string;
    dimensionField: string;
    dimensionAlias: string;
    dimensionAliasPlaceholder: string;
    measureField: string;
    aggregation: string;
    measureAlias: string;
    measureAliasPlaceholder: string;
    rowLimit: string;
    rowLimitPlaceholder: string;
    numericColumnsEmpty: string;
  };
  filterBar: {
    chooseField: string;
    title: string;
    description: string;
    enabled: string;
    disabled: string;
    enableFilter: string;
    filterField: string;
    operator: string;
    filterValue: string;
    filterValuePlaceholder: string;
    helperText: string;
  };
  queryWorkspace: {
    savedProjects: string;
    noSavedProjects: string;
    dashboardViews: string;
    noSavedDashboardViews: string;
    noDataSource: string;
    jobActivity: string;
    noBackgroundJobs: string;
    status: string;
    noMessage: string;
    durationPending: string;
    cancel: string;
    queryBuilder: string;
    rowsMeta: (rows: number) => string;
    projectName: string;
    projectNamePlaceholder: string;
    projectId: (projectId: string) => string;
    working: string;
    saveProject: string;
    importProjectJson: string;
    saveDashboardView: string;
    openCurrentProject: string;
    exporting: string;
    exportProjectJson: string;
    warmCache: string;
    profileData: string;
    exportCsv: string;
    exportXlsx: string;
    exportPdf: string;
    running: string;
    runQuery: string;
    cancelExport: string;
    backendRecommendation: string;
    backendRecommendationDescription: string;
    loading: string;
    applyRecommendation: string;
    suggestedChart: (chartType: string) => string;
    noRecommendation: string;
    dataProfile: string;
    fieldsMeta: (fields: number) => string;
    profileSummary: (rows: number) => string;
    distinctSummary: (
      distinctCount: number,
      nullCount: number,
      nonNullCount: number,
    ) => string;
    samples: (values: string[]) => string;
    noSamples: string;
    workspaceResultPreview: string;
    loadDatasetEmpty: string;
    jobKind: (kind: string) => string;
    jobStatus: (status: string) => string;
  };
  dashboard: {
    title: string;
    noAnalysisYet: string;
    emptyState: string;
    up: string;
    down: string;
    standardWidth: string;
    wideWidth: string;
    chart: string;
    bar: string;
    line: string;
    loadingChartRenderer: string;
    querySpec: string;
    dimensionsMeta: (count: number) => string;
    resultTable: string;
    dataSource: string;
    returnedRows: string;
    columns: string;
    execution: string;
    unknown: string;
  };
  queryResultTable: {
    rowsMeta: (rows: number) => string;
    pageSummary: (page: number, totalPages: number) => string;
    visibleRows: (rows: number) => string;
    sortedBy: (column: string, direction: "asc" | "desc") => string;
    pageSize: (rows: number) => string;
    previous: string;
    next: string;
    sortDirection: Record<"asc" | "desc", string>;
  };
  dataPreview: {
    empty: string;
    columns: string;
    previewRows: string;
    totalRows: string;
    previewColumnsAriaLabel: string;
    emptyCell: string;
  };
  actions: {
    queued: string;
    dataSourceLoadMissingStatus: string;
    dataSourceLoadCancelled: string;
    dataSourceLoadFailed: string;
    dataSourceResultUnavailable: string;
    loadedDataSource: (name: string, rows: number) => string;
    restoreDataSourceMissing: string;
    restoreQueryInvalid: string;
    restoredDashboard: (name: string) => string;
    restoreQueryFailed: string;
    saveDashboardViewRequiresDataSource: string;
    dashboardViewFallback: (index: number) => string;
    dashboardViewAdded: (name: string) => string;
    importCancelled: string;
    importedProject: (name: string, count: number) => string;
    exportCancelled: string;
    exportedProject: (name: string, path: string) => string;
    savedProject: (name: string, count: number) => string;
    warmCacheRequiresDataSource: string;
    warmCacheMissingStatus: string;
    warmCacheCancelled: (name: string) => string;
    warmCacheFailed: string;
    warmedCache: (name: string) => string;
    profileRequiresDataSource: string;
    profileMissingStatus: string;
    profileCancelled: (name: string) => string;
    profileFailed: string;
    profileUnavailable: string;
    profiledDataSource: (
      name: string,
      fields: number,
      rows: number,
    ) => string;
    exportQueryCancelled: (formatLabel: string) => string;
    exportQueryFailed: (formatLabel: string) => string;
    exportedQueryResult: (
      queryName: string,
      formatLabel: string,
      path: string,
    ) => string;
    cancellingExport: string;
    cancellationRequested: string;
    noSavedProjectMetadata: string;
    incompleteQueryTitle: string;
    incompleteQueryMessage: string;
    openedProject: (name: string, count: number) => string;
    queryExecuted: (name: string, rows: number) => string;
    recommendationApplied: (title: string) => string;
    dashboardViewMissing: string;
    openedDashboardView: (name: string) => string;
    exportStatusMissing: string;
  };
  fieldLabels: {
    aggregation: (value: string) => string;
    operator: (value: string) => string;
  };
}

const JOB_KIND_LABELS: Record<string, { en: string; zh: string }> = {
  load_data_source: {
    en: "Data source load",
    zh: "数据源加载",
  },
  profile_data_source: {
    en: "Data profile",
    zh: "数据概况",
  },
  warm_data_source_cache: {
    en: "Cache warmup",
    zh: "缓存预热",
  },
  export_csv: {
    en: "CSV export",
    zh: "CSV 导出",
  },
  export_xlsx: {
    en: "XLSX export",
    zh: "XLSX 导出",
  },
  export_pdf: {
    en: "PDF export",
    zh: "PDF 导出",
  },
  export: {
    en: "Export",
    zh: "导出",
  },
};

const JOB_STATUS_LABELS: Record<JobStatus, { en: string; zh: string }> = {
  queued: {
    en: "Queued",
    zh: "已排队",
  },
  running: {
    en: "Running",
    zh: "进行中",
  },
  succeeded: {
    en: "Succeeded",
    zh: "已成功",
  },
  failed: {
    en: "Failed",
    zh: "失败",
  },
  cancelled: {
    en: "Cancelled",
    zh: "已取消",
  },
};

const AGGREGATION_LABELS: Record<string, { en: string; zh: string }> = {
  sum: {
    en: "Sum",
    zh: "求和",
  },
  avg: {
    en: "Average",
    zh: "平均值",
  },
  count: {
    en: "Count",
    zh: "计数",
  },
  min: {
    en: "Minimum",
    zh: "最小值",
  },
  max: {
    en: "Maximum",
    zh: "最大值",
  },
  count_distinct: {
    en: "Count Distinct",
    zh: "去重计数",
  },
};

const FILTER_OPERATOR_LABELS: Record<string, { en: string; zh: string }> = {
  eq: {
    en: "Equals",
    zh: "等于",
  },
  neq: {
    en: "Not equal",
    zh: "不等于",
  },
  gt: {
    en: "Greater than",
    zh: "大于",
  },
  gte: {
    en: "Greater than or equal",
    zh: "大于等于",
  },
  lt: {
    en: "Less than",
    zh: "小于",
  },
  lte: {
    en: "Less than or equal",
    zh: "小于等于",
  },
  in: {
    en: "In list",
    zh: "在列表中",
  },
  not_in: {
    en: "Not in list",
    zh: "不在列表中",
  },
  contains: {
    en: "Contains",
    zh: "包含",
  },
  is_null: {
    en: "Is null",
    zh: "为空",
  },
  is_not_null: {
    en: "Is not null",
    zh: "非空",
  },
};

const WORKBENCH_COPY: Record<AppLanguage, WorkbenchCopy> = {
  en: {
    hero: {
      eyebrow: "Offline Desktop BI",
      dashboardTitle: "Analysis dashboard",
      workspaceTitle: "Analysis workspace",
      dashboardDescription:
        "Review KPI cards, charts, and result rows generated from the current semantic query.",
      workspaceDescription:
        "Load local CSV files, configure semantic queries, and prepare analysis results for the dashboard.",
      workspaceButton: "Workspace",
      dashboardButton: "Dashboard",
      languageLabel: "Language",
      languageEnglish: "English",
      languageChinese: "中文",
    },
    datasetImport: {
      dataSourcesTitle: "Data sources",
      noDataSources: "No data sources loaded yet.",
      dataSourceTitle: "Data source",
      dataSourceMetaFile: "file",
      detailName: "Name",
      detailPath: "Path",
      detailRows: "Rows",
      datasetImportTitle: "Dataset import",
      datasetImportMeta: "CSV, Excel, Parquet, or SQLite",
      localFilePath: "Local file path",
      localFilePathPlaceholder:
        "E:\\data\\sales.csv, E:\\data\\sales.xlsx, E:\\data\\sales.parquet, or E:\\data\\sales.db",
      chooseFile: "Choose File",
      opening: "Opening...",
      loadFile: "Load File",
      loading: "Loading...",
      helperText:
        "Choose a local CSV, Excel, Parquet, or SQLite file with the system dialog or paste a path and load it directly.",
      previewTitle: "Preview",
      previewRows: "rows",
    },
    fieldPane: {
      none: "None",
      title: "Field Pane",
      description:
        "Review inferred column metadata and map dimensions and measures for the active semantic query.",
      columns: "columns",
      dimensionSlot: "Dimension Slot",
      dimensionSlotHelper: "Drag a field here to map the chart dimension.",
      measureSlot: "Measure Slot",
      measureSlotHelper: "Drag a field here to map the chart measure.",
      queryName: "Query name",
      queryNamePlaceholder: "Revenue by city",
      dimensionField: "Dimension field",
      dimensionAlias: "Dimension alias",
      dimensionAliasPlaceholder: "city",
      measureField: "Measure field",
      aggregation: "Aggregation",
      measureAlias: "Measure alias",
      measureAliasPlaceholder: "total_revenue",
      rowLimit: "Row limit",
      rowLimitPlaceholder: "10",
      numericColumnsEmpty:
        "This dataset has no inferred numeric columns. Count-based queries still work, but numeric aggregations will fail unless you choose a compatible field.",
    },
    filterBar: {
      chooseField: "Choose field",
      title: "Filter Bar",
      description:
        "Configure an optional semantic-query filter for the active dataset.",
      enabled: "Enabled",
      disabled: "Disabled",
      enableFilter: "Enable filter",
      filterField: "Filter field",
      operator: "Operator",
      filterValue: "Filter value",
      filterValuePlaceholder: "APAC or 100,200",
      helperText:
        "Filters are optional. Enable the filter bar to constrain the current semantic query.",
    },
    queryWorkspace: {
      savedProjects: "Saved projects",
      noSavedProjects: "No saved projects yet.",
      dashboardViews: "Dashboard views",
      noSavedDashboardViews: "No saved dashboard views yet.",
      noDataSource: "No data source",
      jobActivity: "Job activity",
      noBackgroundJobs: "No background jobs yet.",
      status: "Status",
      noMessage: "No message",
      durationPending: "Duration pending",
      cancel: "Cancel",
      queryBuilder: "Query Builder",
      rowsMeta: (rows) => `${rows} rows`,
      projectName: "Project name",
      projectNamePlaceholder: "Offline BI Project",
      projectId: (projectId) => `Project id: ${projectId}`,
      working: "Working...",
      saveProject: "Save Project",
      importProjectJson: "Import Project JSON",
      saveDashboardView: "Save Dashboard View",
      openCurrentProject: "Open Current Project",
      exporting: "Exporting...",
      exportProjectJson: "Export Project JSON",
      warmCache: "Warm Cache",
      profileData: "Profile Data",
      exportCsv: "Export CSV",
      exportXlsx: "Export XLSX",
      exportPdf: "Export PDF",
      running: "Running...",
      runQuery: "Run Query",
      cancelExport: "Cancel Export",
      backendRecommendation: "Backend Recommendation",
      backendRecommendationDescription:
        "Apply a backend-generated query suggestion and chart hint without losing the manual builder.",
      loading: "Loading...",
      applyRecommendation: "Apply Recommendation",
      suggestedChart: (chartType) => `Suggested chart: ${chartType}`,
      noRecommendation:
        "No backend recommendation is available for the current field set.",
      dataProfile: "Data Profile",
      fieldsMeta: (fields) => `${fields} fields`,
      profileSummary: (rows) =>
        `${rows} rows profiled from the current cached Parquet source.`,
      distinctSummary: (distinctCount, nullCount, nonNullCount) =>
        `Distinct ${distinctCount} | Null ${nullCount} | Non-null ${nonNullCount}`,
      samples: (values) => `Samples: ${values.join(", ")}`,
      noSamples: "Samples: none",
      workspaceResultPreview: "Workspace Result Preview",
      loadDatasetEmpty:
        "Load a dataset to start configuring dimensions, measures, and filters.",
      jobKind: (kind) => JOB_KIND_LABELS[kind]?.en ?? kind,
      jobStatus: (status) =>
        JOB_STATUS_LABELS[status as JobStatus]?.en ?? status,
    },
    dashboard: {
      title: "Dashboard",
      noAnalysisYet: "No analysis yet",
      emptyState:
        "Run a query from the workspace to populate the dashboard with KPI cards, a chart, and result rows.",
      up: "Up",
      down: "Down",
      standardWidth: "Standard Width",
      wideWidth: "Wide Width",
      chart: "Chart",
      bar: "Bar",
      line: "Line",
      loadingChartRenderer: "Loading chart renderer...",
      querySpec: "Query Spec",
      dimensionsMeta: (count) => `${count} dimensions`,
      resultTable: "Result Table",
      dataSource: "Data source",
      returnedRows: "Returned rows",
      columns: "Columns",
      execution: "Execution",
      unknown: "Unknown",
    },
    queryResultTable: {
      rowsMeta: (rows) => `${rows} rows`,
      pageSummary: (page, totalPages) => `Page ${page} of ${totalPages}`,
      visibleRows: (rows) => `${rows} visible rows`,
      sortedBy: (column, direction) =>
        `Sorted by ${column} (${direction === "asc" ? "ascending" : "descending"})`,
      pageSize: (rows) => `${rows} rows`,
      previous: "Previous",
      next: "Next",
      sortDirection: {
        asc: "asc",
        desc: "desc",
      },
    },
    dataPreview: {
      empty: "Choose a local file to verify the loader end to end.",
      columns: "columns",
      previewRows: "preview rows",
      totalRows: "total rows",
      previewColumnsAriaLabel: "Preview columns",
      emptyCell: "Empty",
    },
    actions: {
      queued: "Queued",
      dataSourceLoadMissingStatus:
        "The data source load status could not be loaded.",
      dataSourceLoadCancelled: "Data source load cancelled.",
      dataSourceLoadFailed: "The data source load job failed.",
      dataSourceResultUnavailable:
        "The loaded data source result was not available.",
      loadedDataSource: (name, rows) =>
        `Loaded data source "${name}" with ${rows} rows.`,
      restoreDataSourceMissing:
        "Opened project metadata, but the saved dashboard data source could not be restored.",
      restoreQueryInvalid:
        "Opened project metadata, but the saved dashboard query is no longer valid.",
      restoredDashboard: (name) =>
        `Opened project and restored dashboard "${name}".`,
      restoreQueryFailed:
        "Opened project metadata, but rerunning the saved dashboard query failed.",
      saveDashboardViewRequiresDataSource:
        "Load a data source before saving a dashboard view.",
      dashboardViewFallback: (index) => `Dashboard View ${index}`,
      dashboardViewAdded: (name) =>
        `Added dashboard view "${name}". Save Project to persist it.`,
      importCancelled: "Import cancelled.",
      importedProject: (name, count) =>
        `Imported project "${name}" with ${count} data sources.`,
      exportCancelled: "Export cancelled.",
      exportedProject: (name, path) =>
        `Exported project "${name}" to ${path}.`,
      savedProject: (name, count) =>
        `Saved project "${name}" with ${count} data sources.`,
      warmCacheRequiresDataSource:
        "Load a data source before warming the cache.",
      warmCacheMissingStatus: "The cache warmup status could not be loaded.",
      warmCacheCancelled: (name) => `Cache warmup cancelled for "${name}".`,
      warmCacheFailed: "The cache warmup job failed.",
      warmedCache: (name) => `Warmed cache for "${name}".`,
      profileRequiresDataSource: "Load a data source before profiling.",
      profileMissingStatus: "The profiling job status could not be loaded.",
      profileCancelled: (name) => `Profiling cancelled for "${name}".`,
      profileFailed: "The profiling job failed.",
      profileUnavailable: "The profiling result was not available.",
      profiledDataSource: (name, fields, rows) =>
        `Profiled "${name}" with ${fields} fields across ${rows} rows.`,
      exportQueryCancelled: (formatLabel) => `${formatLabel} export cancelled.`,
      exportQueryFailed: (formatLabel) =>
        `The ${formatLabel} export job failed.`,
      exportedQueryResult: (queryName, formatLabel, path) =>
        `Exported query result "${queryName}" as ${formatLabel} to ${path}.`,
      cancellingExport: "Cancelling export...",
      cancellationRequested: "Cancellation requested",
      noSavedProjectMetadata: "No saved project metadata was found.",
      incompleteQueryTitle: "Query configuration is incomplete",
      incompleteQueryMessage:
        "Configure at least one dimension or measure before running the query.",
      openedProject: (name, count) =>
        `Opened project "${name}" with ${count} data sources.`,
      queryExecuted: (name, rows) =>
        `Executed query "${name}" and returned ${rows} rows.`,
      recommendationApplied: (title) =>
        `Applied backend recommendation "${title}".`,
      dashboardViewMissing: "The selected dashboard view could not be found.",
      openedDashboardView: (name) => `Opened dashboard view "${name}".`,
      exportStatusMissing: "The export job status could not be loaded.",
    },
    fieldLabels: {
      aggregation: (value) => AGGREGATION_LABELS[value]?.en ?? value,
      operator: (value) => FILTER_OPERATOR_LABELS[value]?.en ?? value,
    },
  },
  zh: {
    hero: {
      eyebrow: "离线桌面 BI",
      dashboardTitle: "分析仪表盘",
      workspaceTitle: "分析工作区",
      dashboardDescription:
        "查看当前语义查询生成的 KPI 卡片、图表和结果行。",
      workspaceDescription:
        "加载本地 CSV 文件，配置语义查询，并为仪表盘准备分析结果。",
      workspaceButton: "工作区",
      dashboardButton: "仪表盘",
      languageLabel: "语言",
      languageEnglish: "English",
      languageChinese: "中文",
    },
    datasetImport: {
      dataSourcesTitle: "数据源",
      noDataSources: "还没有加载任何数据源。",
      dataSourceTitle: "当前数据源",
      dataSourceMetaFile: "文件",
      detailName: "名称",
      detailPath: "路径",
      detailRows: "行数",
      datasetImportTitle: "数据集导入",
      datasetImportMeta: "CSV、Excel、Parquet 或 SQLite",
      localFilePath: "本地文件路径",
      localFilePathPlaceholder:
        "E:\\data\\sales.csv、E:\\data\\sales.xlsx、E:\\data\\sales.parquet 或 E:\\data\\sales.db",
      chooseFile: "选择文件",
      opening: "打开中...",
      loadFile: "加载文件",
      loading: "加载中...",
      helperText:
        "可以通过系统对话框选择本地 CSV、Excel、Parquet 或 SQLite 文件，也可以直接粘贴路径后加载。",
      previewTitle: "预览",
      previewRows: "行",
    },
    fieldPane: {
      none: "无",
      title: "字段面板",
      description: "查看推断出的列元数据，并为当前语义查询映射维度和度量。",
      columns: "列",
      dimensionSlot: "维度槽位",
      dimensionSlotHelper: "将字段拖到这里，映射图表维度。",
      measureSlot: "度量槽位",
      measureSlotHelper: "将字段拖到这里，映射图表度量。",
      queryName: "查询名称",
      queryNamePlaceholder: "按城市统计收入",
      dimensionField: "维度字段",
      dimensionAlias: "维度别名",
      dimensionAliasPlaceholder: "city",
      measureField: "度量字段",
      aggregation: "聚合方式",
      measureAlias: "度量别名",
      measureAliasPlaceholder: "total_revenue",
      rowLimit: "行数限制",
      rowLimitPlaceholder: "10",
      numericColumnsEmpty:
        "当前数据集没有推断出数值列。仍然可以运行基于计数的查询，但如果没有选择兼容字段，数值聚合会失败。",
    },
    filterBar: {
      chooseField: "选择字段",
      title: "筛选栏",
      description: "为当前数据集配置可选的语义查询筛选条件。",
      enabled: "已启用",
      disabled: "已关闭",
      enableFilter: "启用筛选",
      filterField: "筛选字段",
      operator: "操作符",
      filterValue: "筛选值",
      filterValuePlaceholder: "APAC 或 100,200",
      helperText:
        "筛选条件是可选的。启用筛选栏后，可以约束当前语义查询。",
    },
    queryWorkspace: {
      savedProjects: "已保存项目",
      noSavedProjects: "还没有已保存的项目。",
      dashboardViews: "仪表盘视图",
      noSavedDashboardViews: "还没有已保存的仪表盘视图。",
      noDataSource: "无数据源",
      jobActivity: "任务活动",
      noBackgroundJobs: "还没有后台任务。",
      status: "状态",
      noMessage: "无消息",
      durationPending: "耗时待定",
      cancel: "取消",
      queryBuilder: "查询构建器",
      rowsMeta: (rows) => `${rows} 行`,
      projectName: "项目名称",
      projectNamePlaceholder: "离线 BI 项目",
      projectId: (projectId) => `项目 ID：${projectId}`,
      working: "处理中...",
      saveProject: "保存项目",
      importProjectJson: "导入项目 JSON",
      saveDashboardView: "保存仪表盘视图",
      openCurrentProject: "打开当前项目",
      exporting: "导出中...",
      exportProjectJson: "导出项目 JSON",
      warmCache: "预热缓存",
      profileData: "分析数据概况",
      exportCsv: "导出 CSV",
      exportXlsx: "导出 XLSX",
      exportPdf: "导出 PDF",
      running: "运行中...",
      runQuery: "运行查询",
      cancelExport: "取消导出",
      backendRecommendation: "后端推荐",
      backendRecommendationDescription:
        "应用后端生成的查询建议和图表提示，同时保留手动构建器配置。",
      loading: "加载中...",
      applyRecommendation: "应用推荐",
      suggestedChart: (chartType) => `推荐图表：${chartType}`,
      noRecommendation: "当前字段集合没有可用的后端推荐。",
      dataProfile: "数据概况",
      fieldsMeta: (fields) => `${fields} 个字段`,
      profileSummary: (rows) => `已基于当前缓存的 Parquet 数据源分析 ${rows} 行。`,
      distinctSummary: (distinctCount, nullCount, nonNullCount) =>
        `去重 ${distinctCount} | 空值 ${nullCount} | 非空 ${nonNullCount}`,
      samples: (values) => `样本值：${values.join("，")}`,
      noSamples: "样本值：无",
      workspaceResultPreview: "工作区结果预览",
      loadDatasetEmpty: "先加载一个数据集，再开始配置维度、度量和筛选条件。",
      jobKind: (kind) => JOB_KIND_LABELS[kind]?.zh ?? kind,
      jobStatus: (status) =>
        JOB_STATUS_LABELS[status as JobStatus]?.zh ?? status,
    },
    dashboard: {
      title: "仪表盘",
      noAnalysisYet: "暂无分析结果",
      emptyState: "先在工作区运行查询，再将 KPI 卡片、图表和结果行填充到仪表盘。",
      up: "上移",
      down: "下移",
      standardWidth: "标准宽度",
      wideWidth: "加宽显示",
      chart: "图表",
      bar: "柱状图",
      line: "折线图",
      loadingChartRenderer: "正在加载图表渲染器...",
      querySpec: "查询定义",
      dimensionsMeta: (count) => `${count} 个维度`,
      resultTable: "结果表",
      dataSource: "数据源",
      returnedRows: "返回行数",
      columns: "列数",
      execution: "执行耗时",
      unknown: "未知",
    },
    queryResultTable: {
      rowsMeta: (rows) => `${rows} 行`,
      pageSummary: (page, totalPages) => `第 ${page} / ${totalPages} 页`,
      visibleRows: (rows) => `当前可见 ${rows} 行`,
      sortedBy: (column, direction) =>
        `按 ${column} 排序（${direction === "asc" ? "升序" : "降序"}）`,
      pageSize: (rows) => `${rows} 行`,
      previous: "上一页",
      next: "下一页",
      sortDirection: {
        asc: "升序",
        desc: "降序",
      },
    },
    dataPreview: {
      empty: "选择一个本地文件，验证加载流程是否完整可用。",
      columns: "列",
      previewRows: "预览行",
      totalRows: "总行数",
      previewColumnsAriaLabel: "预览列",
      emptyCell: "空值",
    },
    actions: {
      queued: "已排队",
      dataSourceLoadMissingStatus: "无法读取数据源加载状态。",
      dataSourceLoadCancelled: "数据源加载已取消。",
      dataSourceLoadFailed: "数据源加载任务失败。",
      dataSourceResultUnavailable: "无法获取已加载的数据源结果。",
      loadedDataSource: (name, rows) => `已加载数据源“${name}”，共 ${rows} 行。`,
      restoreDataSourceMissing:
        "已打开项目元数据，但无法恢复保存的仪表盘数据源。",
      restoreQueryInvalid: "已打开项目元数据，但保存的仪表盘查询已失效。",
      restoredDashboard: (name) => `已打开项目并恢复仪表盘“${name}”。`,
      restoreQueryFailed: "已打开项目元数据，但重新执行保存的仪表盘查询失败。",
      saveDashboardViewRequiresDataSource: "请先加载数据源，再保存仪表盘视图。",
      dashboardViewFallback: (index) => `仪表盘视图 ${index}`,
      dashboardViewAdded: (name) =>
        `已添加仪表盘视图“${name}”。请保存项目以持久化。`,
      importCancelled: "已取消导入。",
      importedProject: (name, count) => `已导入项目“${name}”，包含 ${count} 个数据源。`,
      exportCancelled: "已取消导出。",
      exportedProject: (name, path) => `已将项目“${name}”导出到 ${path}。`,
      savedProject: (name, count) => `已保存项目“${name}”，包含 ${count} 个数据源。`,
      warmCacheRequiresDataSource: "请先加载数据源，再预热缓存。",
      warmCacheMissingStatus: "无法读取缓存预热状态。",
      warmCacheCancelled: (name) => `已取消“${name}”的缓存预热。`,
      warmCacheFailed: "缓存预热任务失败。",
      warmedCache: (name) => `已完成“${name}”的缓存预热。`,
      profileRequiresDataSource: "请先加载数据源，再执行数据概况分析。",
      profileMissingStatus: "无法读取数据概况分析任务状态。",
      profileCancelled: (name) => `已取消“${name}”的数据概况分析。`,
      profileFailed: "数据概况分析任务失败。",
      profileUnavailable: "无法获取数据概况分析结果。",
      profiledDataSource: (name, fields, rows) =>
        `已分析“${name}”，共 ${fields} 个字段、${rows} 行。`,
      exportQueryCancelled: (formatLabel) => `已取消 ${formatLabel} 导出。`,
      exportQueryFailed: (formatLabel) => `${formatLabel} 导出任务失败。`,
      exportedQueryResult: (queryName, formatLabel, path) =>
        `已将查询结果“${queryName}”导出为 ${formatLabel}，保存到 ${path}。`,
      cancellingExport: "正在取消导出...",
      cancellationRequested: "已请求取消",
      noSavedProjectMetadata: "未找到已保存的项目元数据。",
      incompleteQueryTitle: "查询配置不完整",
      incompleteQueryMessage: "请至少配置一个维度或度量后再运行查询。",
      openedProject: (name, count) => `已打开项目“${name}”，包含 ${count} 个数据源。`,
      queryExecuted: (name, rows) => `已执行查询“${name}”，返回 ${rows} 行。`,
      recommendationApplied: (title) => `已应用后端推荐“${title}”。`,
      dashboardViewMissing: "找不到所选的仪表盘视图。",
      openedDashboardView: (name) => `已打开仪表盘视图“${name}”。`,
      exportStatusMissing: "无法读取导出任务状态。",
    },
    fieldLabels: {
      aggregation: (value) => AGGREGATION_LABELS[value]?.zh ?? value,
      operator: (value) => FILTER_OPERATOR_LABELS[value]?.zh ?? value,
    },
  },
};

export function getWorkbenchCopy(language: AppLanguage) {
  return WORKBENCH_COPY[language];
}
