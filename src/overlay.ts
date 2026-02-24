import type { DragRect, Corner } from './types.ts';
import { state } from './state.ts';
import { HANDLE_SIZE, MIN_RECT_SIZE, CLOSE_BUTTON_SIZE, EDGE_TOL } from './constants.ts';

/** 将鼠标事件坐标转换为 overlay 上的像素坐标（与 PDF 该页 canvas 一致） */
export function getLocalCoords(
  overlay: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = overlay.getBoundingClientRect();
  const scaleX = overlay.width / rect.width;
  const scaleY = overlay.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

/** 在某一页的 overlay 上重绘所有该页的矩形 + 当前拖拽中的矩形；selectedIdx 用于高亮选中项；选中项画四角手柄 */
export function drawOverlay(
  overlay: HTMLCanvasElement,
  pageNum: number,
  dragRect: DragRect | null,
  selectedIdx: number
): void {
  const ctx = overlay.getContext('2d');
  if (!ctx) return;
  const w = overlay.width;
  const h = overlay.height;
  ctx.clearRect(0, 0, w, h);

  for (let idx = 0; idx < state.fields.length; idx++) {
    const f = state.fields[idx];
    if (!f || f.page !== pageNum) continue;
    ctx.strokeStyle = idx === selectedIdx ? 'rgba(255, 193, 7, 0.95)' : 'rgba(33, 150, 243, 0.9)';
    ctx.lineWidth = idx === selectedIdx ? 3 : 2;
    ctx.setLineDash([]);
    ctx.strokeRect(f.x, f.y, f.width, f.height);
  }

  if (selectedIdx >= 0) {
    const sel = state.fields[selectedIdx];
    if (sel !== undefined && sel.page === pageNum) {
      const hs = HANDLE_SIZE / 2;
      ctx.fillStyle = 'rgba(255, 193, 7, 0.9)';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      const corners: [number, number][] = [
        [sel.x, sel.y],
        [sel.x + sel.width, sel.y],
        [sel.x, sel.y + sel.height],
        [sel.x + sel.width, sel.y + sel.height],
      ];
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - hs, cy - hs, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(cx - hs, cy - hs, HANDLE_SIZE, HANDLE_SIZE);
      }
      const btnX = sel.x + sel.width - CLOSE_BUTTON_SIZE - 4;
      const btnY = sel.y + 4;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(btnX, btnY, CLOSE_BUTTON_SIZE, CLOSE_BUTTON_SIZE);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeRect(btnX, btnY, CLOSE_BUTTON_SIZE, CLOSE_BUTTON_SIZE);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(btnX + 4, btnY + 4);
      ctx.lineTo(btnX + CLOSE_BUTTON_SIZE - 4, btnY + CLOSE_BUTTON_SIZE - 4);
      ctx.moveTo(btnX + CLOSE_BUTTON_SIZE - 4, btnY + 4);
      ctx.lineTo(btnX + 4, btnY + CLOSE_BUTTON_SIZE - 4);
      ctx.stroke();
    }
  }

  if (dragRect) {
    ctx.strokeStyle = 'rgba(255, 152, 0, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(dragRect.x, dragRect.y, dragRect.width, dragRect.height);
    ctx.setLineDash([]);
  }
}

/** 若 (localX, localY) 在当前选中框的某个角柄上，返回 { corner }，否则返回 null */
export function getHandleAt(
  _overlay: HTMLCanvasElement,
  pageNum: number,
  localX: number,
  localY: number
): { corner: Corner } | null {
  if (state.selectedIndex < 0 || state.selectedIndex >= state.fields.length) return null;
  const f = state.fields[state.selectedIndex];
  if (!f || f.page !== pageNum) return null;
  const hs = HANDLE_SIZE / 2;
  const corners: { corner: Corner; x: number; y: number }[] = [
    { corner: 'nw', x: f.x, y: f.y },
    { corner: 'ne', x: f.x + f.width, y: f.y },
    { corner: 'sw', x: f.x, y: f.y + f.height },
    { corner: 'se', x: f.x + f.width, y: f.y + f.height },
  ];
  for (const c of corners) {
    if (localX >= c.x - hs && localX <= c.x + hs && localY >= c.y - hs && localY <= c.y + hs) {
      return { corner: c.corner };
    }
  }
  return null;
}

/** 若 (localX, localY) 在当前选中框的关闭按钮内，返回 true */
export function getCloseButtonHit(
  _overlay: HTMLCanvasElement,
  pageNum: number,
  localX: number,
  localY: number
): boolean {
  if (state.selectedIndex < 0 || state.selectedIndex >= state.fields.length) return false;
  const f = state.fields[state.selectedIndex];
  if (f === undefined || f['page'] !== pageNum) return false;
  const btnX = f.x + f.width - CLOSE_BUTTON_SIZE - 4;
  const btnY = f.y + 4;
  return (
    localX >= btnX &&
    localX <= btnX + CLOSE_BUTTON_SIZE &&
    localY >= btnY &&
    localY <= btnY + CLOSE_BUTTON_SIZE
  );
}

/** 若 (localX, localY) 在某个字段矩形内（含边线），返回该字段在 fields 中的下标（取最上层）；否则返回 -1 */
export function getFieldAtPoint(
  _overlay: HTMLCanvasElement,
  pageNum: number,
  localX: number,
  localY: number
): number {
  for (let i = state.fields.length - 1; i >= 0; i--) {
    const f = state.fields[i];
    if (f === undefined || f.page !== pageNum) continue;
    if (localX >= f.x && localX <= f.x + f.width && localY >= f.y && localY <= f.y + f.height)
      return i;
  }
  return -1;
}

/** 若 (localX, localY) 在当前选中框的四条边上（不含四角、不含关闭按钮），返回 true */
export function getEdgeHit(
  _overlay: HTMLCanvasElement,
  pageNum: number,
  localX: number,
  localY: number
): boolean {
  if (state.selectedIndex < 0 || state.selectedIndex >= state.fields.length) return false;
  const f = state.fields[state.selectedIndex];
  if (f === undefined || f['page'] !== pageNum) return false;
  const hs = HANDLE_SIZE / 2;
  const top =
    localY >= f.y - EDGE_TOL &&
    localY <= f.y + EDGE_TOL &&
    localX >= f.x + hs &&
    localX <= f.x + f.width - hs;
  const bottom =
    localY >= f.y + f.height - EDGE_TOL &&
    localY <= f.y + f.height + EDGE_TOL &&
    localX >= f.x + hs &&
    localX <= f.x + f.width - hs;
  const left =
    localX >= f.x - EDGE_TOL &&
    localX <= f.x + EDGE_TOL &&
    localY >= f.y + hs &&
    localY <= f.y + f.height - hs;
  const right =
    localX >= f.x + f.width - EDGE_TOL &&
    localX <= f.x + f.width + EDGE_TOL &&
    localY >= f.y + hs &&
    localY <= f.y + f.height - hs;
  return top || bottom || left || right;
}

/** 根据拖拽角与当前鼠标位置更新字段的 x,y,width,height */
export function applyResize(
  fieldIndex: number,
  corner: Corner,
  localX: number,
  localY: number
): void {
  const f = state.fields[fieldIndex];
  if (!f) return;
  let x = f.x,
    y = f.y,
    w = f.width,
    h = f.height;
  if (corner === 'nw') {
    x = Math.min(localX, f.x + f.width - MIN_RECT_SIZE);
    y = Math.min(localY, f.y + f.height - MIN_RECT_SIZE);
    w = f.x + f.width - x;
    h = f.y + f.height - y;
  } else if (corner === 'ne') {
    y = Math.min(localY, f.y + f.height - MIN_RECT_SIZE);
    w = Math.max(MIN_RECT_SIZE, localX - f.x);
    h = f.y + f.height - y;
  } else if (corner === 'sw') {
    x = Math.min(localX, f.x + f.width - MIN_RECT_SIZE);
    w = f.x + f.width - x;
    h = Math.max(MIN_RECT_SIZE, localY - f.y);
  } else {
    // 'se'
    w = Math.max(MIN_RECT_SIZE, localX - f.x);
    h = Math.max(MIN_RECT_SIZE, localY - f.y);
  }
  f.x = x;
  f.y = y;
  f.width = w;
  f.height = h;
}

export function redrawAllOverlays(): void {
  for (const item of state.overlaysByPage) {
    drawOverlay(item.overlay, item.pageNum, null, state.selectedIndex);
  }
}

function onResizeMove(e: MouseEvent): void {
  if (!state.resizeState) return;
  const { x, y } = getLocalCoords(state.resizeState.overlay, e.clientX, e.clientY);
  applyResize(state.resizeState.fieldIndex, state.resizeState.corner, x, y);
  drawOverlay(state.resizeState.overlay, state.resizeState.pageNum, null, state.selectedIndex);
}

function finishResize(onResizeEnd: () => void): void {
  if (!state.resizeState) return;
  state.resizeState = null;
  onResizeEnd();
}

function onMoveMove(e: MouseEvent): void {
  if (!state.moveState) return;
  const { x, y } = getLocalCoords(state.moveState.overlay, e.clientX, e.clientY);
  const f = state.fields[state.moveState.fieldIndex];
  if (!f) return;
  const dx = x - state.moveState.startLocalX;
  const dy = y - state.moveState.startLocalY;
  const newX = Math.max(
    0,
    Math.min(state.moveState.overlay.width - f.width, state.moveState.initialFieldX + dx)
  );
  const newY = Math.max(
    0,
    Math.min(state.moveState.overlay.height - f.height, state.moveState.initialFieldY + dy)
  );
  f.x = newX;
  f.y = newY;
  drawOverlay(state.moveState.overlay, state.moveState.pageNum, null, state.selectedIndex);
}

function finishMove(onMoveEnd: () => void): void {
  if (!state.moveState) return;
  state.moveState = null;
  onMoveEnd();
}

export function setupOverlay(
  wrapper: HTMLDivElement,
  canvas: HTMLCanvasElement,
  pageNum: number,
  onDeleteField: (index: number) => void,
  onSelectField: (index: number) => void,
  onDragEnd: (pageNum: number, x1: number, y1: number, width: number, height: number) => void,
  onResizeEnd: () => void,
  onMoveEnd: () => void
): void {
  const overlay = document.createElement('canvas');
  overlay.className = 'pdf-overlay';
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  if (canvas.style.width) overlay.style.width = canvas.style.width;
  if (canvas.style.height) overlay.style.height = canvas.style.height;
  overlay.dataset['page'] = String(pageNum);

  let dragStart: { x: number; y: number } | null = null;

  overlay.addEventListener('mousedown', (e) => {
    const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
    const handle = getHandleAt(overlay, pageNum, x, y);
    if (handle) {
      e.preventDefault();
      state.resizeState = {
        fieldIndex: state.selectedIndex,
        corner: handle.corner,
        overlay,
        pageNum,
      };
      const resizeUp = () => {
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', resizeUp);
        finishResize(onResizeEnd);
      };
      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', resizeUp);
      return;
    }
    if (getCloseButtonHit(overlay, pageNum, x, y)) {
      e.preventDefault();
      onDeleteField(state.selectedIndex);
      return;
    }
    if (getEdgeHit(overlay, pageNum, x, y)) {
      e.preventDefault();
      const f = state.fields[state.selectedIndex];
      if (!f) return;
      state.moveState = {
        fieldIndex: state.selectedIndex,
        startLocalX: x,
        startLocalY: y,
        initialFieldX: f.x,
        initialFieldY: f.y,
        overlay,
        pageNum,
      };
      const moveUp = () => {
        document.removeEventListener('mousemove', onMoveMove);
        document.removeEventListener('mouseup', moveUp);
        finishMove(onMoveEnd);
      };
      document.addEventListener('mousemove', onMoveMove);
      document.addEventListener('mouseup', moveUp);
      return;
    }
    const fieldIdx = getFieldAtPoint(overlay, pageNum, x, y);
    if (fieldIdx >= 0) {
      e.preventDefault();
      onSelectField(fieldIdx);
      return;
    }
    dragStart = { x, y };
  });

  overlay.addEventListener('mousemove', (e) => {
    if (state.resizeState) return;
    if (state.moveState) return;
    if (!dragStart) {
      const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
      if (getCloseButtonHit(overlay, pageNum, x, y)) {
        overlay.style.cursor = 'pointer';
      } else if (getEdgeHit(overlay, pageNum, x, y)) {
        overlay.style.cursor = 'move';
      } else {
        const handle = getHandleAt(overlay, pageNum, x, y);
        if (handle) {
          overlay.style.cursor =
            handle.corner === 'nw' || handle.corner === 'se' ? 'nwse-resize' : 'nesw-resize';
        } else if (getFieldAtPoint(overlay, pageNum, x, y) >= 0) {
          overlay.style.cursor = 'pointer';
        } else {
          overlay.style.cursor = 'crosshair';
        }
      }
      return;
    }
    const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
    const dragRect: DragRect = {
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      width: Math.abs(x - dragStart.x),
      height: Math.abs(y - dragStart.y),
    };
    drawOverlay(overlay, pageNum, dragRect, state.selectedIndex);
  });

  overlay.addEventListener('mouseup', (e) => {
    if (state.resizeState) return;
    if (state.moveState) return;
    if (!dragStart) return;
    const { x, y } = getLocalCoords(overlay, e.clientX, e.clientY);
    const x1 = Math.min(dragStart.x, x);
    const y1 = Math.min(dragStart.y, y);
    const width = Math.abs(x - dragStart.x);
    const height = Math.abs(y - dragStart.y);
    dragStart = null;
    if (width >= 5 && height >= 5) {
      onDragEnd(pageNum, x1, y1, width, height);
    }
    drawOverlay(overlay, pageNum, null, state.selectedIndex);
  });

  overlay.addEventListener('mouseleave', () => {
    if (state.resizeState) return;
    if (state.moveState) return;
    if (dragStart) {
      dragStart = null;
      drawOverlay(overlay, pageNum, null, state.selectedIndex);
    }
  });

  state.overlaysByPage.push({ overlay, pageNum });
  drawOverlay(overlay, pageNum, null, state.selectedIndex);
  wrapper.appendChild(overlay);
}
