import { useMemo, useState, type ChangeEvent } from "react";
import type { DataColumn, LoadedDataSource } from "@bi/ts-contracts";
import { Button, Input, Select, type SelectOption } from "@bi/ui-kit";
import {
  MEASURE_AGGREGATIONS,
  type QueryBuilderState,
} from "../../../entities/field/types";
import FieldDropZone from "../../../shared/dnd/FieldDropZone";
import DraggableFieldChip from "../../../shared/dnd/DraggableFieldChip";
import { useAppUiStore } from "../../../shared/lib/appUiStore";
import { getWorkbenchCopy } from "../../../shared/lib/i18n";

interface FieldPaneProps {
  activeDataSource: LoadedDataSource;
  queryBuilder: QueryBuilderState;
  numericColumns: DataColumn[];
  onUpdateQueryBuilder: <K extends keyof QueryBuilderState>(
    key: K,
    value: QueryBuilderState[K],
  ) => void;
}

const INITIAL_VISIBLE_COLUMNS = 120;

function FieldPane({
  activeDataSource,
  queryBuilder,
  numericColumns,
  onUpdateQueryBuilder,
}: FieldPaneProps) {
  const language = useAppUiStore((state) => state.language);
  const copy = getWorkbenchCopy(language);
  const [showAllColumns, setShowAllColumns] = useState(false);

  const fieldOptions: SelectOption[] = useMemo(
    () => [
      { label: copy.fieldPane.none, value: "" },
      ...activeDataSource.columns.map((column) => ({
        label: column.name,
        value: column.name,
      })),
    ],
    [activeDataSource.columns, copy.fieldPane.none],
  );

  const aggregationOptions: SelectOption[] = MEASURE_AGGREGATIONS.map(
    (aggregation) => ({
      label: copy.fieldLabels.aggregation(aggregation),
      value: aggregation,
    }),
  );

  const visibleColumns = showAllColumns
    ? activeDataSource.columns
    : activeDataSource.columns.slice(0, INITIAL_VISIBLE_COLUMNS);
  const hasHiddenColumns =
    activeDataSource.columns.length > visibleColumns.length;

  function handleFieldSelect(column: DataColumn) {
    const isNumeric =
      column.data_type === "integer" || column.data_type === "number";

    if (isNumeric) {
      onUpdateQueryBuilder("measureField", column.name);
      onUpdateQueryBuilder(
        "measureAlias",
        `${queryBuilder.measureAggregation}_${column.name}`,
      );
      return;
    }

    onUpdateQueryBuilder("dimensionField", column.name);
    onUpdateQueryBuilder("dimensionAlias", column.name);
  }

  return (
    <section className="grid gap-5 rounded-3xl bg-slate-100/70 p-5">
      <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <div className="grid gap-1">
          <h3 className="m-0 text-lg font-semibold tracking-tight text-slate-950">
            {copy.fieldPane.title}
          </h3>
          <p className="helper-text">{copy.fieldPane.description}</p>
        </div>
        <span className="text-sm text-slate-500">
          {`${activeDataSource.columns.length} ${copy.fieldPane.columns}`}
        </span>
      </div>

      <ul className="column-list">
        {visibleColumns.map((column) => (
          <li key={column.name}>
            <DraggableFieldChip
              column={column}
              onSelect={handleFieldSelect}
              title={
                language === "zh"
                  ? `\u62d6\u52a8\u6216\u70b9\u51fb ${column.name} \u4ee5\u586b\u5165\u67e5\u8be2\u69fd\u4f4d`
                  : `Drag or click ${column.name} to use it in the query`
              }
            />
          </li>
        ))}
      </ul>
      {hasHiddenColumns ? (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setShowAllColumns(true)}>
            {language === "zh"
              ? `\u663e\u793a\u5269\u4f59 ${activeDataSource.columns.length - visibleColumns.length} \u5217`
              : `Show remaining ${activeDataSource.columns.length - visibleColumns.length} columns`}
          </Button>
        </div>
      ) : null}

      <div className="drop-zone-grid">
        <FieldDropZone
          label={copy.fieldPane.dimensionSlot}
          value={queryBuilder.dimensionField}
          helperText={copy.fieldPane.dimensionSlotHelper}
          onFieldDrop={(payload) => {
            onUpdateQueryBuilder("dimensionField", payload.name);
            onUpdateQueryBuilder("dimensionAlias", payload.name);
          }}
        />
        <FieldDropZone
          label={copy.fieldPane.measureSlot}
          value={queryBuilder.measureField}
          helperText={copy.fieldPane.measureSlotHelper}
          onFieldDrop={(payload) => {
            onUpdateQueryBuilder("measureField", payload.name);
            onUpdateQueryBuilder("measureAlias", `total_${payload.name}`);
          }}
        />
      </div>

      <div className="builder-grid">
        <label className="builder-field">
          <span className="field-label">{copy.fieldPane.queryName}</span>
          <Input
            value={queryBuilder.name}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onUpdateQueryBuilder("name", event.currentTarget.value)
            }
            placeholder={copy.fieldPane.queryNamePlaceholder}
          />
        </label>
        <label className="builder-field">
          <span className="field-label">{copy.fieldPane.dimensionField}</span>
          <Select
            value={queryBuilder.dimensionField}
            options={fieldOptions}
            onValueChange={(value: string) =>
              onUpdateQueryBuilder("dimensionField", value)
            }
          />
        </label>
        <label className="builder-field">
          <span className="field-label">{copy.fieldPane.dimensionAlias}</span>
          <Input
            value={queryBuilder.dimensionAlias}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onUpdateQueryBuilder("dimensionAlias", event.currentTarget.value)
            }
            placeholder={copy.fieldPane.dimensionAliasPlaceholder}
          />
        </label>
        <label className="builder-field">
          <span className="field-label">{copy.fieldPane.measureField}</span>
          <Select
            value={queryBuilder.measureField}
            options={fieldOptions}
            onValueChange={(value: string) =>
              onUpdateQueryBuilder("measureField", value)
            }
          />
        </label>
        <label className="builder-field">
          <span className="field-label">{copy.fieldPane.aggregation}</span>
          <Select
            value={queryBuilder.measureAggregation}
            options={aggregationOptions}
            onValueChange={(value: string) =>
              onUpdateQueryBuilder(
                "measureAggregation",
                value as QueryBuilderState["measureAggregation"],
              )
            }
          />
        </label>
        <label className="builder-field">
          <span className="field-label">{copy.fieldPane.measureAlias}</span>
          <Input
            value={queryBuilder.measureAlias}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onUpdateQueryBuilder("measureAlias", event.currentTarget.value)
            }
            placeholder={copy.fieldPane.measureAliasPlaceholder}
          />
        </label>
        <label className="builder-field">
          <span className="field-label">{copy.fieldPane.rowLimit}</span>
          <Input
            value={queryBuilder.limit}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onUpdateQueryBuilder("limit", event.currentTarget.value)
            }
            placeholder={copy.fieldPane.rowLimitPlaceholder}
            inputMode="numeric"
          />
        </label>
      </div>

      {numericColumns.length === 0 ? (
        <p className="empty-state">{copy.fieldPane.numericColumnsEmpty}</p>
      ) : null}
    </section>
  );
}

export default FieldPane;
