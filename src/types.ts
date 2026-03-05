/** Field type (aligned with mission format) */
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'checkbox';

/** Vertical alignment within field (same level as name, type, page) */
export type VerticalAlign = 'top' | 'middle' | 'bottom';

/** Single field: box coordinates + form info */
export interface Field {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  name: string;
  type: FieldType;
  description: string;
  verticalAlign: VerticalAlign;
}

/** Temporary rectangle while dragging to draw */
export interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Corner handle identifier */
export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/** Per-page overlay reference */
export interface OverlayItem {
  overlay: HTMLCanvasElement;
  pageNum: number;
}

/** Drag state while resizing */
export interface ResizeState {
  fieldIndex: number;
  corner: Corner;
  overlay: HTMLCanvasElement;
  pageNum: number;
}

/** Drag state while moving box */
export interface MoveState {
  fieldIndex: number;
  startLocalX: number;
  startLocalY: number;
  initialFieldX: number;
  initialFieldY: number;
  overlay: HTMLCanvasElement;
  pageNum: number;
}

/** Optional export config (same level as scale, fields) */
export interface ExportOptions {
  checkboxSymbol: string;
  fontSize: number;
  fontColor: string;
  paddingX: number;
  paddingY: number;
}

/** Exported JSON structure (mission format). scale is viewport scale at render (1 PDF point = scale pixels); backend uses it to convert x,y,width,height from pixels to PDF points */
export interface FieldsExport {
  scale?: number;
  checkboxSymbol?: string;
  fontSize?: number;
  fontColor?: string;
  paddingX?: number;
  paddingY?: number;
  fields: Array<{
    name: string;
    type: string;
    description: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    verticalAlign?: VerticalAlign;
  }>;
}
