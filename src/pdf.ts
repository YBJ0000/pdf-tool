import * as pdfjsLib from 'pdfjs-dist';
import type { FieldType } from './types.ts';
import { state } from './state.ts';
import { setupOverlay, redrawAllOverlays } from './overlay.ts';

export interface RenderPdfDeps {
  pdfContainer: HTMLElement;
  setStatus: (text: string) => void;
  renderFieldList: () => void;
  hideForm: () => void;
  deleteField: (index: number) => void;
  selectField: (index: number) => void;
}

/** PDF AcroForm 控件类型到工具 Field 类型的映射；对 Tx 按字段名识别 date（date/dob/birthday） */
function mapPdfFieldType(pdfType: string | undefined, fieldName: string): FieldType {
  switch (pdfType) {
    case 'Tx': {
      const lower = fieldName.toLowerCase();
      if (/\bdate\b/.test(lower) || /\bdob\b/.test(lower) || /\bbirthday\b/.test(lower)) {
        return 'date';
      }
      return 'string';
    }
    case 'Btn':
      return 'checkbox';
    case 'Ch':
    case 'Sig':
    default:
      return 'string';
  }
}

/** 从已加载的 PDF 中检测 AcroForm 表单字段（Widget 注解），写入 state.fields 并刷新列表与 overlay */
async function detectAcroFormFields(
  pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>,
  scale: number,
  deps: { renderFieldList: () => void; setStatus: (text: string) => void }
): Promise<number> {
  let count = 0;
  const numPages = pdf.numPages;
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const annotations = await page.getAnnotations({ intent: 'display' });
    for (const ann of annotations) {
      if (ann.subtype !== 'Widget') continue;
      const rect = ann.rect as number[] | undefined;
      if (!rect || rect.length < 4) continue;
      const vRect = viewport.convertToViewportRectangle(rect);
      const x = Math.min(vRect[0], vRect[2]);
      const y = Math.min(vRect[1], vRect[3]);
      const width = Math.abs(vRect[2] - vRect[0]);
      const height = Math.abs(vRect[3] - vRect[1]);
      if (width < 1 || height < 1) continue;
      const name = typeof ann.fieldName === 'string' ? ann.fieldName : '';
      state.fields.push({
        x,
        y,
        width,
        height,
        page: pageNum,
        name: name || `field_${state.fields.length + 1}`,
        type: mapPdfFieldType(ann.fieldType, name),
        description: '',
        verticalAlign: 'middle',
      });
      count++;
    }
  }
  if (count > 0) {
    deps.renderFieldList();
    redrawAllOverlays();
  }
  return count;
}

export function clearPdf(
  pdfContainer: HTMLElement,
  deps: { renderFieldList: () => void; hideForm: () => void }
): void {
  pdfContainer.innerHTML = '';
  state.fields.length = 0;
  state.overlaysByPage.length = 0;
  state.selectedIndex = -1;
  state.resizeState = null;
  state.moveState = null;
  deps.renderFieldList();
  deps.hideForm();
}

export async function renderPdf(
  arrayBuffer: ArrayBuffer,
  deps: RenderPdfDeps
): Promise<void> {
  const { pdfContainer, setStatus, renderFieldList, hideForm, deleteField, selectField } = deps;
  clearPdf(pdfContainer, { renderFieldList, hideForm });
  setStatus('加载中…');

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    setStatus('共 ' + numPages + ' 页，渲染中…');

    const pixelRatio = window.devicePixelRatio || 1;
    const scale = 1.5 * pixelRatio;
    state.pdfScale = scale;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper';
      wrapper.dataset['page'] = String(pageNum);

      const label = document.createElement('span');
      label.className = 'page-label';
      label.textContent = '第 ' + pageNum + ' 页';
      wrapper.appendChild(label);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = viewport.width / pixelRatio + 'px';
      canvas.style.height = viewport.height / pixelRatio + 'px';

      wrapper.appendChild(canvas);
      pdfContainer.appendChild(wrapper);

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;

      setupOverlay(
        wrapper,
        canvas,
        pageNum,
        deleteField,
        selectField,
        (pNum, x1, y1, width, height) => {
          state.fields.push({
            x: x1,
            y: y1,
            width,
            height,
            page: pNum,
            name: '',
            type: 'string',
            description: '',
            verticalAlign: 'middle',
          });
          setStatus('已添加框，共 ' + state.fields.length + ' 个');
          renderFieldList();
          selectField(state.fields.length - 1);
        },
        () => setStatus('已调整框大小'),
        () => setStatus('已移动框')
      );
    }

    const detected = await detectAcroFormFields(pdf, scale, {
      renderFieldList,
      setStatus,
    });
    if (detected > 0) {
      setStatus('已加载 ' + numPages + ' 页，已自动检测 ' + detected + ' 个表单字段，可拖拽画矩形');
    } else {
      setStatus('已加载 ' + numPages + ' 页，可拖拽画矩形');
    }
  } catch (err) {
    console.error(err);
    setStatus('加载失败: ' + (err instanceof Error ? err.message : String(err)));
  }
}
