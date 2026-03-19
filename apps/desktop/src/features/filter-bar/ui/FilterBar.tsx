import type { ChangeEvent } from "react";
import type { LoadedDataSource } from "@bi/ts-contracts";
import { Input, Select, type SelectOption } from "@bi/ui-kit";
import {
  FILTER_OPERATORS,
  type QueryBuilderState,
} from "../../../entities/field/types";
import { useAppUiStore } from "../../../shared/lib/appUiStore";
import { getWorkbenchCopy } from "../../../shared/lib/i18n";

interface FilterBarProps {
  activeDataSource: LoadedDataSource;
  queryBuilder: QueryBuilderState;
  onUpdateQueryBuilder: <K extends keyof QueryBuilderState>(
    key: K,
    value: QueryBuilderState[K],
  ) => void;
}

function FilterBar({
  activeDataSource,
  queryBuilder,
  onUpdateQueryBuilder,
}: FilterBarProps) {
  const language = useAppUiStore((state) => state.language);
  const copy = getWorkbenchCopy(language);
  const fieldOptions: SelectOption[] = [
    { label: copy.filterBar.chooseField, value: "" },
    ...activeDataSource.columns.map((column) => ({
      label: column.name,
      value: column.name,
    })),
  ];
  const operatorOptions: SelectOption[] = FILTER_OPERATORS.map((operator) => ({
    label: copy.fieldLabels.operator(operator),
    value: operator,
  }));

  return (
    <section className="filter-panel">
      <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <div className="grid gap-1">
          <h3 className="m-0 text-lg font-semibold tracking-tight text-slate-950">
            {copy.filterBar.title}
          </h3>
          <p className="helper-text">{copy.filterBar.description}</p>
        </div>
        <span className="text-sm text-slate-500">
          {queryBuilder.filterEnabled
            ? copy.filterBar.enabled
            : copy.filterBar.disabled}
        </span>
      </div>

      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={queryBuilder.filterEnabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onUpdateQueryBuilder("filterEnabled", event.currentTarget.checked)
          }
        />
        <span>{copy.filterBar.enableFilter}</span>
      </label>

      {queryBuilder.filterEnabled ? (
        <div className="filter-grid">
          <label className="builder-field">
            <span className="field-label">{copy.filterBar.filterField}</span>
            <Select
              value={queryBuilder.filterField}
              options={fieldOptions}
              onValueChange={(value: string) =>
                onUpdateQueryBuilder("filterField", value)
              }
            />
          </label>
          <label className="builder-field">
            <span className="field-label">{copy.filterBar.operator}</span>
            <Select
              value={queryBuilder.filterOperator}
              options={operatorOptions}
              onValueChange={(value: string) =>
                onUpdateQueryBuilder(
                  "filterOperator",
                  value as QueryBuilderState["filterOperator"],
                )
              }
            />
          </label>
          <label className="builder-field">
            <span className="field-label">{copy.filterBar.filterValue}</span>
            <Input
              value={queryBuilder.filterValue}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onUpdateQueryBuilder("filterValue", event.currentTarget.value)
              }
              placeholder={copy.filterBar.filterValuePlaceholder}
              disabled={
                queryBuilder.filterOperator === "is_null" ||
                queryBuilder.filterOperator === "is_not_null"
              }
            />
          </label>
        </div>
      ) : (
        <p className="helper-text">{copy.filterBar.helperText}</p>
      )}
    </section>
  );
}

export default FilterBar;
