import type { ChangeEvent } from "react";
import type { LoadedDataSource } from "@bi/ts-contracts";
import {
  Button,
  Input,
  LayoutGrid,
  Panel,
  PanelHeader,
  SectionPanel,
} from "@bi/ui-kit";
import type { DataSourceEntry } from "../../../entities/dataset/types";
import { useAppUiStore } from "../../../shared/lib/appUiStore";
import { getWorkbenchCopy } from "../../../shared/lib/i18n";
import DataPreviewTable from "./DataPreviewTable";

interface DatasetImportPanelProps {
  path: string;
  activeDataSource: LoadedDataSource | null;
  dataSources: DataSourceEntry[];
  isLoading: boolean;
  isPickingFile: boolean;
  onPathChange: (value: string) => void;
  onPickFile: () => void;
  onLoadDataSource: () => void;
  onActivateDataSource: (entry: DataSourceEntry) => void;
}

function DatasetImportPanel({
  path,
  activeDataSource,
  dataSources,
  isLoading,
  isPickingFile,
  onPathChange,
  onPickFile,
  onLoadDataSource,
  onActivateDataSource,
}: DatasetImportPanelProps) {
  const language = useAppUiStore((state) => state.language);
  const copy = getWorkbenchCopy(language);

  return (
    <>
      <LayoutGrid className="results-grid">
        <Panel>
          <PanelHeader
            title={copy.datasetImport.dataSourcesTitle}
            meta={dataSources.length}
          />
          {dataSources.length > 0 ? (
            <ul className="source-list">
              {dataSources.map((entry) => {
                const isActive = entry.id === activeDataSource?.info.path;
                return (
                  <li key={entry.id}>
                    <Button
                      variant="ghost"
                      className={`source-item${isActive ? " active" : ""}`}
                      onClick={() => onActivateDataSource(entry)}
                    >
                      <span className="source-name">
                        {entry.loaded.info.name}
                      </span>
                      <span className="source-meta">
                        {`${entry.loaded.total_rows} ${copy.datasetImport.previewRows}`}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">{copy.datasetImport.noDataSources}</p>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title={copy.datasetImport.dataSourceTitle}
            meta={
              activeDataSource?.info.type ?? copy.datasetImport.dataSourceMetaFile
            }
          />
          <dl className="detail-list">
            <div>
              <dt>{copy.datasetImport.detailName}</dt>
              <dd>{activeDataSource?.info.name ?? "-"}</dd>
            </div>
            <div>
              <dt>{copy.datasetImport.detailPath}</dt>
              <dd>{activeDataSource?.info.path ?? "-"}</dd>
            </div>
            <div>
              <dt>{copy.datasetImport.detailRows}</dt>
              <dd>{activeDataSource?.total_rows ?? 0}</dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <PanelHeader
            title={copy.datasetImport.datasetImportTitle}
            meta={copy.datasetImport.datasetImportMeta}
          />
          <div className="project-form">
            <label className="field-label" htmlFor="data-source-path">
              {copy.datasetImport.localFilePath}
            </label>
            <Input
              id="data-source-path"
              value={path}
              placeholder={copy.datasetImport.localFilePathPlaceholder}
              autoComplete="off"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onPathChange(event.currentTarget.value)
              }
            />
            <div className="action-row">
              <Button
                variant="secondary"
                onClick={onPickFile}
                disabled={isLoading || isPickingFile}
              >
                {isPickingFile
                  ? copy.datasetImport.opening
                  : copy.datasetImport.chooseFile}
              </Button>
              <Button
                variant="default"
                onClick={onLoadDataSource}
                disabled={isLoading || !path.trim()}
              >
                {isLoading
                  ? copy.datasetImport.loading
                  : copy.datasetImport.loadFile}
              </Button>
            </div>
            <p className="helper-text">{copy.datasetImport.helperText}</p>
          </div>
        </Panel>
      </LayoutGrid>

      <SectionPanel className="preview-panel">
        <PanelHeader
          title={copy.datasetImport.previewTitle}
          meta={
            activeDataSource
              ? `${activeDataSource.preview_rows.length} / ${activeDataSource.total_rows} ${copy.datasetImport.previewRows}`
              : `0 ${copy.datasetImport.previewRows}`
          }
        />
        <DataPreviewTable
          columns={activeDataSource?.columns.map((column) => column.name) ?? []}
          rows={activeDataSource?.preview_rows ?? []}
          totalRows={activeDataSource?.total_rows ?? 0}
        />
      </SectionPanel>
    </>
  );
}

export default DatasetImportPanel;
