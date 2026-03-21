import { Button, ErrorBanner, Panel, PanelHeader, Select } from "@bi/ui-kit";
import type { QueryWorkspaceProps } from "../../features/chart-builder/ui/QueryWorkspace";
import DatasetImportPanel from "../../features/dataset-import/ui/DatasetImportPanel";
import { useAppUiStore } from "../../shared/lib/appUiStore";
import { getWorkbenchCopy } from "../../shared/lib/i18n";

function ImportPreparationWidget({
  path,
  activeDataSource,
  dataSources,
  error,
  status,
  isLoading,
  isPickingFile,
  profileResult,
  onPathChange,
  onPickFile,
  onLoadDataSource,
  onActivateDataSource,
  onWarmDataSourceCache,
  onProfileDataSource,
}: QueryWorkspaceProps) {
  const language = useAppUiStore((state) => state.language);
  const setLanguage = useAppUiStore((state) => state.setLanguage);
  const copy = getWorkbenchCopy(language);
  const surfaceCopy =
    language === "zh"
      ? {
          eyebrow: "导入与清洗",
          title: "数据导入与清洗",
          description:
            "先导入本地数据、确认预览和字段概况，再进入分析工作台处理查询、图表和仪表盘。",
          actions: "准备动作",
          stageReady: "数据已接入，可继续做剖析或进入下一层工作台。",
        }
      : {
          eyebrow: "Import and cleanup",
          title: "Data import and cleanup",
          description:
            "Start by loading local data, checking the preview, and profiling fields before moving into the analysis studio.",
          actions: "Preparation actions",
          stageReady:
            "The dataset is connected. You can profile it here or move on to the studio page.",
        };

  return (
    <>
      <Panel className="import-stage-hero">
        <div className="import-stage-hero-copy">
          <div className="hero-stack">
            <p className="import-stage-eyebrow">{surfaceCopy.eyebrow}</p>
            <h1 className="hero-title">{surfaceCopy.title}</h1>
            <p className="hero-subcopy">{surfaceCopy.description}</p>
            <div className="hero-status-strip">
              <div className="hero-status-chip">
                <span>{language === "zh" ? "数据接入" : "Data ingress"}</span>
                <strong>{activeDataSource ? "READY" : "PENDING"}</strong>
                <p>
                  {activeDataSource
                    ? activeDataSource.info.name
                    : language === "zh"
                      ? "等待本地文件选择"
                      : "Awaiting local source selection"}
                </p>
              </div>
              <div className="hero-status-chip">
                <span>{language === "zh" ? "处理模式" : "Process mode"}</span>
                <strong>{language === "zh" ? "离线" : "OFFLINE"}</strong>
                <p>
                  {language === "zh"
                    ? "缓存与分析均在本地执行"
                    : "Caching and analysis stay local"}
                </p>
              </div>
              <div className="hero-status-chip">
                <span>{language === "zh" ? "入口状态" : "Ingress state"}</span>
                <strong>{isLoading ? "SYNC" : "STANDBY"}</strong>
                <p>{status || surfaceCopy.stageReady}</p>
              </div>
            </div>
          </div>
          <div className="import-stage-language">
            <span className="hero-language-label">
              {copy.hero.languageLabel}
            </span>
            <Select
              value={language}
              options={[
                { label: copy.hero.languageEnglish, value: "en" },
                { label: copy.hero.languageChinese, value: "zh" },
              ]}
              onValueChange={(value: string) =>
                setLanguage(value === "zh" ? "zh" : "en")
              }
            />
            <div className="hero-metrics">
              <div className="hero-metric">
                <span>{language === "zh" ? "源数量" : "Source count"}</span>
                <strong>{String(dataSources.length).padStart(2, "0")}</strong>
                <small>
                  {language === "zh" ? "已装载数据源" : "Loaded data sources"}
                </small>
              </div>
              <div className="hero-metric">
                <span>{language === "zh" ? "缓存预热" : "Cache warmup"}</span>
                <strong>
                  {activeDataSource?.info.cache_path ? "LINKED" : "UNSET"}
                </strong>
                <small>
                  {activeDataSource?.info.cache_path ??
                    (language === "zh"
                      ? "等待 Parquet 缓存"
                      : "Awaiting Parquet cache")}
                </small>
              </div>
            </div>
          </div>
        </div>
        {!error && status ? (
          <p className="status-message success">{status}</p>
        ) : null}
        {!error && activeDataSource ? (
          <p className="helper-text">{surfaceCopy.stageReady}</p>
        ) : null}
        {error ? (
          <ErrorBanner
            title={error.title}
            message={error.message}
            details={error.details}
            code={error.code}
          />
        ) : null}
      </Panel>

      <Panel className="import-stage-actions">
        <PanelHeader
          title={surfaceCopy.actions}
          meta={activeDataSource?.info.name ?? copy.queryWorkspace.noDataSource}
        />
        <div className="action-row">
          <Button
            variant="secondary"
            onClick={onWarmDataSourceCache}
            disabled={
              isLoading ||
              !activeDataSource ||
              !(
                activeDataSource.info.cache_path ||
                activeDataSource.info.type === "parquet"
              )
            }
          >
            {isLoading && activeDataSource
              ? copy.queryWorkspace.working
              : copy.queryWorkspace.warmCache}
          </Button>
          <Button
            variant="secondary"
            onClick={onProfileDataSource}
            disabled={
              isLoading ||
              !activeDataSource ||
              !(
                activeDataSource.info.cache_path ||
                activeDataSource.info.type === "parquet"
              )
            }
          >
            {isLoading && activeDataSource
              ? copy.queryWorkspace.working
              : copy.queryWorkspace.profileData}
          </Button>
        </div>
      </Panel>

      <DatasetImportPanel
        path={path}
        activeDataSource={activeDataSource}
        dataSources={dataSources}
        isLoading={isLoading}
        isPickingFile={isPickingFile}
        onPathChange={onPathChange}
        onPickFile={onPickFile}
        onLoadDataSource={onLoadDataSource}
        onActivateDataSource={onActivateDataSource}
      />

      {profileResult ? (
        <Panel className="query-panel">
          <PanelHeader
            title={copy.queryWorkspace.dataProfile}
            meta={copy.queryWorkspace.fieldsMeta(profileResult.field_count)}
          />
          <p className="helper-text">
            {copy.queryWorkspace.profileSummary(profileResult.row_count)}
          </p>
          <ul className="job-list">
            {profileResult.fields.slice(0, 8).map((field) => (
              <li key={field.name} className="job-item">
                <div className="job-item-copy">
                  <strong className="source-name">{field.name}</strong>
                  <span className="source-meta">{field.data_type}</span>
                  <span className="source-meta">
                    {copy.queryWorkspace.distinctSummary(
                      field.distinct_count,
                      field.null_count,
                      field.non_null_count,
                    )}
                  </span>
                  <span className="source-meta">
                    {field.sample_values.length > 0
                      ? copy.queryWorkspace.samples(field.sample_values)
                      : copy.queryWorkspace.noSamples}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}

export default ImportPreparationWidget;
