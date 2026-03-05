import { state } from './state.ts';
import { redrawAllOverlays } from './overlay.ts';

export function renderFieldList(
  fieldListEl: HTMLElement,
  exportBtn: HTMLButtonElement,
  onSelectField: (index: number) => void,
  onDeleteField: (index: number) => void
): void {
  fieldListEl.innerHTML = '';
  state.fields.forEach((f, i) => {
    const li = document.createElement('li');
    li.dataset['index'] = String(i);
    li.classList.toggle('selected', i === state.selectedIndex);

    const label = document.createElement('span');
    label.className = 'field-list-label';
    label.textContent = 'Field ' + (i + 1) + (f.name ? ' · ' + f.name : '') + ' (Page ' + f.page + ')';
    label.addEventListener('click', () => onSelectField(i));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'field-delete';
    delBtn.title = 'Delete';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDeleteField(i);
    });

    li.appendChild(label);
    li.appendChild(delBtn);
    fieldListEl.appendChild(li);
  });
  exportBtn.disabled = state.fields.length === 0;
}

export interface DeleteFieldDeps {
  setStatus: (t: string) => void;
  renderFieldList: () => void;
  hideForm: () => void;
}

export function deleteField(index: number, deps: DeleteFieldDeps): void {
  if (index < 0 || index >= state.fields.length) return;
  state.fields.splice(index, 1);
  if (state.selectedIndex === index) {
    state.selectedIndex = -1;
    deps.hideForm();
  } else if (state.selectedIndex > index) {
    state.selectedIndex--;
  }
  deps.renderFieldList();
  redrawAllOverlays();
  deps.setStatus('Deleted, ' + state.fields.length + ' field(s) remaining');
}

export interface SelectFieldDeps {
  pdfContainer: HTMLElement;
  fieldNameInput: HTMLInputElement;
  fieldTypeSelect: HTMLSelectElement;
  fieldDescriptionInput: HTMLTextAreaElement;
  fieldVerticalAlignSelect: HTMLSelectElement;
  showForm: () => void;
  hideForm: () => void;
  renderFieldList: () => void;
}

export function selectField(index: number, deps: SelectFieldDeps): void {
  state.selectedIndex = index;
  deps.renderFieldList();
  redrawAllOverlays();
  if (index < 0) {
    deps.hideForm();
    return;
  }
  const f = state.fields[index];
  if (!f) return;
  deps.fieldNameInput.value = f.name;
  deps.fieldTypeSelect.value = f.type;
  deps.fieldDescriptionInput.value = f.description;
  deps.fieldVerticalAlignSelect.value = f.verticalAlign ?? 'middle';
  deps.showForm();
  const pageEl = deps.pdfContainer.querySelector(
    '.pdf-page-wrapper[data-page="' + String(f.page) + '"]'
  );
  if (pageEl) {
    const overlayItem = state.overlaysByPage.find((item) => item.pageNum === f.page);
    if (overlayItem?.overlay) {
      const displayedHeight = (pageEl as HTMLElement).getBoundingClientRect().height;
      const scaleY = displayedHeight / overlayItem.overlay.height;
      const boxTopInContainer = (pageEl as HTMLElement).offsetTop + f.y * scaleY;
      const targetScrollTop = boxTopInContainer - deps.pdfContainer.clientHeight * 0.5;
      const maxScroll = deps.pdfContainer.scrollHeight - deps.pdfContainer.clientHeight;
      deps.pdfContainer.scrollTo({
        top: Math.max(0, Math.min(targetScrollTop, maxScroll)),
        behavior: 'smooth',
      });
    } else {
      (pageEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}
