import type { Field, OverlayItem, ResizeState, MoveState, ExportOptions } from './types.ts';

/** Default export options (same level as scale, fields); used to prefill export modal and after import */
export const defaultExportOptions: ExportOptions = {
  checkboxSymbol: '',
  fontSize: 12,
  fontColor: '#000000',
  paddingX: 3,
  paddingY: 0,
};

/** Global mutable state: field list, selected index, per-page overlays, drag state; pdfScale is viewport scale at render (1 PDF point = pdfScale pixels), used by backend to convert coordinates on export */
export const state = {
  fields: [] as Field[],
  selectedIndex: -1,
  overlaysByPage: [] as OverlayItem[],
  resizeState: null as ResizeState | null,
  moveState: null as MoveState | null,
  pdfScale: 1 as number,
  /** Last export/import config; prefill when modal opens */
  exportOptions: { ...defaultExportOptions } as ExportOptions,
};
