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
          <div className="grid gap-2">
            <p className="import-stage-eyebrow">{surfaceCopy.eyebrow}</p>
            <h1 className="m-0 text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-none tracking-tight text-slate-950">
              {surfaceCopy.title}
            </h1>
            <p className="m-0 max-w-3xl text-base text-slate-600">
              {surfaceCopy.description}
            </p>
          </div>
          <div className="import-stage-language">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
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
