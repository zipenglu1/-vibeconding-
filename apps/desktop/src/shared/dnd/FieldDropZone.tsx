import type { DragEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  FIELD_DROP_EVENT,
  FIELD_DROP_ZONE_ATTRIBUTE,
  hasDragFieldPayload,
  readDragFieldPayload,
  type DragFieldPayload,
} from "./fieldDrag";

interface FieldDropZoneProps {
  label: string;
  value: string;
  helperText: string;
  onFieldDrop: (payload: DragFieldPayload) => void;
  children?: ReactNode;
}

function FieldDropZone({
  label,
  value,
  helperText,
  onFieldDrop,
  children,
}: FieldDropZoneProps) {
  const [isActive, setIsActive] = useState(false);
  const zoneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const zoneElement = zoneRef.current;
    if (!zoneElement) {
      return;
    }

    function handlePointerFieldDrop(event: Event) {
      const customEvent = event as CustomEvent<DragFieldPayload>;
      setIsActive(false);
      onFieldDrop(customEvent.detail);
    }

    zoneElement.addEventListener(FIELD_DROP_EVENT, handlePointerFieldDrop);
    return () => {
      zoneElement.removeEventListener(FIELD_DROP_EVENT, handlePointerFieldDrop);
    };
  }, [onFieldDrop]);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasDragFieldPayload(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isActive) {
      setIsActive(true);
    }
  }

  function handleDragLeave() {
    if (isActive) {
      setIsActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const payload = readDragFieldPayload(event.dataTransfer);
    setIsActive(false);
    if (!payload) {
      return;
    }

    onFieldDrop(payload);
  }

  return (
    <div
      ref={zoneRef}
      {...{ [FIELD_DROP_ZONE_ATTRIBUTE]: "true" }}
      className={`drop-zone${isActive ? " active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="drop-zone-header">
        <span className="preview-label">{label}</span>
        <strong>{value || "Drop a field here"}</strong>
      </div>
      <p className="helper-text">{helperText}</p>
      {children}
    </div>
  );
}

export default FieldDropZone;
