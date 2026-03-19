import type { DataColumn } from "@bi/ts-contracts";

export const FIELD_DRAG_MIME = "application/x-offline-bi-field";
export const FIELD_DROP_EVENT = "offline-bi-field-drop";
export const FIELD_DROP_ZONE_ATTRIBUTE = "data-field-drop-zone";
export const FIELD_DROP_ZONE_ACTIVE_CLASS = "pointer-drag-hover";
const FIELD_DRAG_TEXT_PREFIX = "__offline_bi_field__:";
const POINTER_DRAG_THRESHOLD = 8;

export interface DragFieldPayload {
  name: string;
  dataType: string;
}

interface PointerFieldDragOptions {
  event: PointerEvent;
  payload: DragFieldPayload;
  sourceElement: HTMLElement;
  onDragStart?: () => void;
}

export function createDragFieldPayload(column: DataColumn): DragFieldPayload {
  return {
    name: column.name,
    dataType: column.data_type,
  };
}

export function writeDragFieldPayload(
  dataTransfer: DataTransfer,
  payload: DragFieldPayload,
) {
  const serialized = JSON.stringify(payload);
  dataTransfer.effectAllowed = "copy";
  dataTransfer.setData(FIELD_DRAG_MIME, serialized);
  dataTransfer.setData("text/plain", `${FIELD_DRAG_TEXT_PREFIX}${serialized}`);
}

export function hasDragFieldPayload(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).some(
    (type) => type === FIELD_DRAG_MIME || type === "text/plain",
  );
}

export function readDragFieldPayload(
  dataTransfer: DataTransfer,
): DragFieldPayload | null {
  const rawPayload =
    dataTransfer.getData(FIELD_DRAG_MIME) || dataTransfer.getData("text/plain");
  if (!rawPayload) {
    return null;
  }

  try {
    const normalizedPayload = rawPayload.startsWith(FIELD_DRAG_TEXT_PREFIX)
      ? rawPayload.slice(FIELD_DRAG_TEXT_PREFIX.length)
      : rawPayload;
    const parsed = JSON.parse(normalizedPayload) as Partial<DragFieldPayload>;
    if (
      typeof parsed.name !== "string" ||
      typeof parsed.dataType !== "string"
    ) {
      return null;
    }

    return {
      name: parsed.name,
      dataType: parsed.dataType,
    };
  } catch {
    return {
      name: rawPayload,
      dataType: "unknown",
    };
  }
}

export function beginPointerFieldDrag({
  event,
  payload,
  sourceElement,
  onDragStart,
}: PointerFieldDragOptions) {
  if (event.button !== 0) {
    return;
  }

  const startX = event.clientX;
  const startY = event.clientY;
  let dragging = false;
  let activeZone: HTMLElement | null = null;
  let pointerCaptured = false;

  function setActiveZone(nextZone: HTMLElement | null) {
    if (activeZone === nextZone) {
      return;
    }

    activeZone?.classList.remove(FIELD_DROP_ZONE_ACTIVE_CLASS);
    activeZone = nextZone;
    activeZone?.classList.add(FIELD_DROP_ZONE_ACTIVE_CLASS);
  }

  function cleanup() {
    window.removeEventListener("pointermove", handlePointerMove, true);
    window.removeEventListener("pointerup", handlePointerUp, true);
    window.removeEventListener("pointercancel", handlePointerCancel, true);
    if (pointerCaptured) {
      sourceElement.releasePointerCapture?.(event.pointerId);
      pointerCaptured = false;
    }
    document.body.classList.remove("field-pointer-dragging");
    setActiveZone(null);
  }

  function handlePointerMove(moveEvent: PointerEvent) {
    if (
      !dragging &&
      Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) <
        POINTER_DRAG_THRESHOLD
    ) {
      return;
    }

    if (!dragging) {
      dragging = true;
      document.body.classList.add("field-pointer-dragging");
      onDragStart?.();
    }

    const hoveredZone = document
      .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
      ?.closest(`[${FIELD_DROP_ZONE_ATTRIBUTE}="true"]`);
    setActiveZone(hoveredZone instanceof HTMLElement ? hoveredZone : null);
  }

  function handlePointerUp(upEvent: PointerEvent) {
    if (dragging && activeZone) {
      upEvent.preventDefault();
      activeZone.dispatchEvent(
        new CustomEvent(FIELD_DROP_EVENT, {
          detail: payload,
        }),
      );
    }

    cleanup();
  }

  function handlePointerCancel() {
    cleanup();
  }

  sourceElement.setPointerCapture?.(event.pointerId);
  pointerCaptured = true;
  window.addEventListener("pointermove", handlePointerMove, true);
  window.addEventListener("pointerup", handlePointerUp, true);
  window.addEventListener("pointercancel", handlePointerCancel, true);
}
