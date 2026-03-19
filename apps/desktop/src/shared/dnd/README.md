# Shared DnD

Active shared drag-and-drop boundary for workbench field interactions.

- `fieldDrag.ts` defines the field drag payload contract and serialization helpers.
- `DraggableFieldChip.tsx` renders draggable field items.
- `FieldDropZone.tsx` renders reusable field drop targets.

The current workbench uses these helpers to drag dataset fields into the query dimension and measure slots.
