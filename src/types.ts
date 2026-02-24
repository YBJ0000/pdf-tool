/** 字段类型（与 mission 一致） */
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'checkbox';

/** 单条字段：画框坐标 + 表单信息 */
export interface Field {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  name: string;
  type: FieldType;
  description: string;
}

/** 拖拽绘制中的临时矩形 */
export interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 角柄标识 */
export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/** 每页 overlay 引用 */
export interface OverlayItem {
  overlay: HTMLCanvasElement;
  pageNum: number;
}

/** 调整大小时的拖拽状态 */
export interface ResizeState {
  fieldIndex: number;
  corner: Corner;
  overlay: HTMLCanvasElement;
  pageNum: number;
}

/** 移动框时的拖拽状态 */
export interface MoveState {
  fieldIndex: number;
  startLocalX: number;
  startLocalY: number;
  initialFieldX: number;
  initialFieldY: number;
  overlay: HTMLCanvasElement;
  pageNum: number;
}

/** 导出的 JSON 结构（mission 格式） */
export interface FieldsExport {
  fields: Array<{
    name: string;
    type: string;
    description: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  }>;
}
