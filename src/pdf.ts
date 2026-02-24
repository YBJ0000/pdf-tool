import * as pdfjsLib from 'pdfjs-dist';
import { state } from './state.ts';
import { setupOverlay } from './overlay.ts';

export interface RenderPdfDeps {
  pdfContainer: HTMLElement;
  setStatus: (text: string) => void;
  renderFieldList: () => void;
  hideForm: () => void;
  deleteField: (index: number) => void;
  selectField: (index: number) => void;
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
          });
          setStatus('已添加框，共 ' + state.fields.length + ' 个');
          renderFieldList();
          selectField(state.fields.length - 1);
        },
        () => setStatus('已调整框大小'),
        () => setStatus('已移动框')
      );
    }

    setStatus('已加载 ' + numPages + ' 页，可拖拽画矩形');
  } catch (err) {
    console.error(err);
    setStatus('加载失败: ' + (err instanceof Error ? err.message : String(err)));
  }
}
