import * as pdfjsLib from 'pdfjs-dist';
import './style.css';
import { renderPdf, type RenderPdfDeps } from './pdf.ts';
import { renderFieldList, deleteField, selectField } from './fieldList.ts';
import { showForm, hideForm, syncFormToField } from './form.ts';
import { exportJson, importJson } from './exportImport.ts';
import { redrawAllOverlays } from './overlay.ts';
import { state, defaultExportOptions } from './state.ts';
import type { ExportOptions } from './types.ts';

// PDF.js worker
if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).href;
}

const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const pdfContainer = document.getElementById('pdfContainer') as HTMLElement;
const statusEl = document.getElementById('status') as HTMLElement;
const fieldListEl = document.getElementById('fieldList') as HTMLElement;
const fieldFormEl = document.getElementById('fieldForm') as HTMLElement;
const fieldNameInput = document.getElementById('fieldName') as HTMLInputElement;
const fieldTypeSelect = document.getElementById('fieldType') as HTMLSelectElement;
const fieldDescriptionInput = document.getElementById('fieldDescription') as HTMLTextAreaElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const importJsonInput = document.getElementById('importJsonInput') as HTMLInputElement;
const exportModal = document.getElementById('exportModal') as HTMLElement;
const exportModalBackdrop = document.getElementById('exportModalBackdrop') as HTMLElement;
const exportCheckboxSymbol = document.getElementById('exportCheckboxSymbol') as HTMLInputElement;
const exportFontSize = document.getElementById('exportFontSize') as HTMLInputElement;
const exportFontColor = document.getElementById('exportFontColor') as HTMLInputElement;
const exportPaddingX = document.getElementById('exportPaddingX') as HTMLInputElement;
const exportPaddingY = document.getElementById('exportPaddingY') as HTMLInputElement;
const exportModalCancel = document.getElementById('exportModalCancel') as HTMLButtonElement;
const exportModalConfirm = document.getElementById('exportModalConfirm') as HTMLButtonElement;

function setStatus(text: string): void {
  statusEl.textContent = text;
}

const hideFormBound = (): void =>
  hideForm(fieldFormEl, fieldNameInput, fieldTypeSelect, fieldDescriptionInput);
const showFormBound = (): void => showForm(fieldFormEl);

let selectFieldBound: (index: number) => void;
let deleteFieldBound: (index: number) => void;

const doRenderFieldList = (): void =>
  renderFieldList(fieldListEl, exportBtn, selectFieldBound, deleteFieldBound);

const deleteFieldDeps = {
  setStatus,
  renderFieldList: doRenderFieldList,
  hideForm: hideFormBound,
};

const selectFieldDeps = {
  pdfContainer,
  fieldNameInput,
  fieldTypeSelect,
  fieldDescriptionInput,
  showForm: showFormBound,
  hideForm: hideFormBound,
  renderFieldList: doRenderFieldList,
};

deleteFieldBound = (index: number) => deleteField(index, deleteFieldDeps);
selectFieldBound = (index: number) => selectField(index, selectFieldDeps);

const renderPdfDeps: RenderPdfDeps = {
  pdfContainer,
  setStatus,
  renderFieldList: doRenderFieldList,
  hideForm: hideFormBound,
  deleteField: deleteFieldBound,
  selectField: selectFieldBound,
};

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (result instanceof ArrayBuffer) renderPdf(result, renderPdfDeps);
  };
  reader.readAsArrayBuffer(file);
});

function openExportModal(): void {
  exportCheckboxSymbol.value = state.exportOptions.checkboxSymbol;
  exportFontSize.value = String(state.exportOptions.fontSize);
  exportFontColor.value = state.exportOptions.fontColor;
  exportPaddingX.value = String(state.exportOptions.paddingX);
  exportPaddingY.value = String(state.exportOptions.paddingY);
  exportModal.classList.remove('hidden');
  exportModal.setAttribute('aria-hidden', 'false');
}

function closeExportModal(): void {
  exportModal.classList.add('hidden');
  exportModal.setAttribute('aria-hidden', 'true');
}

function getExportOptionsFromForm(): ExportOptions {
  const fontSize = parseInt(exportFontSize.value, 10);
  const paddingX = parseInt(exportPaddingX.value, 10);
  const paddingY = parseInt(exportPaddingY.value, 10);
  return {
    checkboxSymbol: exportCheckboxSymbol.value.trim(),
    fontSize: Number.isFinite(fontSize) && fontSize >= 1 ? fontSize : defaultExportOptions.fontSize,
    fontColor: exportFontColor.value.trim() || defaultExportOptions.fontColor,
    paddingX: Number.isFinite(paddingX) && paddingX >= 0 ? paddingX : defaultExportOptions.paddingX,
    paddingY: Number.isFinite(paddingY) && paddingY >= 0 ? paddingY : defaultExportOptions.paddingY,
  };
}

exportBtn.addEventListener('click', () => openExportModal());

exportModalCancel.addEventListener('click', () => closeExportModal());
exportModalBackdrop.addEventListener('click', () => closeExportModal());

exportModalConfirm.addEventListener('click', () => {
  const options = getExportOptionsFromForm();
  state.exportOptions = options;
  exportJson(setStatus, options);
  closeExportModal();
});

importJsonInput.addEventListener('change', () => {
  const file = importJsonInput.files?.[0];
  if (!file) return;
  importJson(file, setStatus, () => {
    hideFormBound();
    doRenderFieldList();
    redrawAllOverlays();
  });
  importJsonInput.value = '';
});

fieldNameInput.addEventListener('input', () =>
  syncFormToField(fieldNameInput, fieldTypeSelect, fieldDescriptionInput, doRenderFieldList)
);
fieldNameInput.addEventListener('change', () =>
  syncFormToField(fieldNameInput, fieldTypeSelect, fieldDescriptionInput, doRenderFieldList)
);
fieldTypeSelect.addEventListener('change', () =>
  syncFormToField(fieldNameInput, fieldTypeSelect, fieldDescriptionInput, doRenderFieldList)
);
fieldDescriptionInput.addEventListener('input', () =>
  syncFormToField(fieldNameInput, fieldTypeSelect, fieldDescriptionInput, doRenderFieldList)
);
fieldDescriptionInput.addEventListener('change', () =>
  syncFormToField(fieldNameInput, fieldTypeSelect, fieldDescriptionInput, doRenderFieldList)
);

document.addEventListener('keydown', (e) => {
  if (state.selectedIndex < 0 || state.selectedIndex >= state.fields.length) return;
  if (e.key !== 'Delete' && e.key !== 'Backspace') return;
  const active = document.activeElement;
  if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
  e.preventDefault();
  deleteFieldBound(state.selectedIndex);
});
