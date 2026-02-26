import type { Field, OverlayItem, ResizeState, MoveState } from './types.ts';

/** 全局可变状态：字段列表、选中下标、每页 overlay、拖拽状态；pdfScale 为渲染时的 viewport scale（1 PDF point = pdfScale 像素），导出时供后端换算坐标 */
export const state = {
  fields: [] as Field[],
  selectedIndex: -1,
  overlaysByPage: [] as OverlayItem[],
  resizeState: null as ResizeState | null,
  moveState: null as MoveState | null,
  pdfScale: 1 as number,
};
