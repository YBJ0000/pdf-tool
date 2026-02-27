import type { Field, OverlayItem, ResizeState, MoveState, ExportOptions } from './types.ts';

/** 导出配置默认值（与 scale、fields 同级别），用于导出弹窗预填与导入后回填 */
export const defaultExportOptions: ExportOptions = {
  checkboxSymbol: '',
  fontSize: 12,
  fontColor: '#000000',
  paddingX: 3,
  paddingY: 0,
};

/** 全局可变状态：字段列表、选中下标、每页 overlay、拖拽状态；pdfScale 为渲染时的 viewport scale（1 PDF point = pdfScale 像素），导出时供后端换算坐标 */
export const state = {
  fields: [] as Field[],
  selectedIndex: -1,
  overlaysByPage: [] as OverlayItem[],
  resizeState: null as ResizeState | null,
  moveState: null as MoveState | null,
  pdfScale: 1 as number,
  /** 上次导出/导入使用的配置，弹窗打开时预填 */
  exportOptions: { ...defaultExportOptions } as ExportOptions,
};
