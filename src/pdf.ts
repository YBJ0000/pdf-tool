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

/** Map PDF AcroForm widget types to tool Field types; for Tx, detect date by field name (date/dob/birthday) */
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

/** Detect AcroForm form fields (Widget annotations) from loaded PDF, write to state.fields and refresh list and overlay */
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
  setStatus('Loading…');

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    setStatus(numPages + ' page(s), rendering…');

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
      label.textContent = 'Page ' + pageNum;
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
          setStatus('Box added, ' + state.fields.length + ' total');
          renderFieldList();
          selectField(state.fields.length - 1);
        },
        () => setStatus('Box resized'),
        () => setStatus('Box moved')
      );
    }

    const detected = await detectAcroFormFields(pdf, scale, {
      renderFieldList,
      setStatus,
    });
    if (detected > 0) {
      setStatus('Loaded ' + numPages + ' page(s), auto-detected ' + detected + ' form field(s). Drag to draw rectangles.');
    } else {
      setStatus('Loaded ' + numPages + ' page(s). Drag to draw rectangles.');
    }
  } catch (err) {
    console.error(err);
    setStatus('Load failed: ' + (err instanceof Error ? err.message : String(err)));
  }
}
