import { useRef, type PointerEvent } from "react";
import type { DataColumn } from "@bi/ts-contracts";
import { beginPointerFieldDrag, createDragFieldPayload } from "./fieldDrag";

interface DraggableFieldChipProps {
  column: DataColumn;
  onSelect?: (column: DataColumn) => void;
  title?: string;
}

function DraggableFieldChip({
  column,
  onSelect,
  title,
}: DraggableFieldChipProps) {
  const suppressClickRef = useRef(false);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    beginPointerFieldDrag({
      event: event.nativeEvent,
      payload: createDragFieldPayload(column),
      sourceElement: event.currentTarget,
      onDragStart: () => {
        suppressClickRef.current = true;
      },
    });
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    onSelect?.(column);
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className="draggable-field"
      title={title ?? `Drag or click ${column.name} to use it in the query`}
    >
      <strong>{column.name}</strong>
      <span>{column.data_type}</span>
    </button>
  );
}

export default DraggableFieldChip;
