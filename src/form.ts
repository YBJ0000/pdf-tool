import { state } from './state.ts';
import type { FieldType, VerticalAlign } from './types.ts';

const VERTICAL_ALIGNS: VerticalAlign[] = ['top', 'middle', 'bottom'];
function toVerticalAlign(s: string): VerticalAlign {
  return VERTICAL_ALIGNS.includes(s as VerticalAlign) ? (s as VerticalAlign) : 'middle';
}

export function showForm(fieldFormEl: HTMLElement): void {
  fieldFormEl.classList.remove('hidden');
}

export function hideForm(
  fieldFormEl: HTMLElement,
  fieldNameInput: HTMLInputElement,
  fieldTypeSelect: HTMLSelectElement,
  fieldDescriptionInput: HTMLTextAreaElement,
  fieldVerticalAlignSelect: HTMLSelectElement
): void {
  fieldFormEl.classList.add('hidden');
  fieldNameInput.value = '';
  fieldTypeSelect.value = 'string';
  fieldDescriptionInput.value = '';
  fieldVerticalAlignSelect.value = 'middle';
}

export function syncFormToField(
  fieldNameInput: HTMLInputElement,
  fieldTypeSelect: HTMLSelectElement,
  fieldDescriptionInput: HTMLTextAreaElement,
  fieldVerticalAlignSelect: HTMLSelectElement,
  renderFieldList: () => void
): void {
  if (state.selectedIndex < 0) return;
  const f = state.fields[state.selectedIndex];
  if (!f) return;
  f.name = fieldNameInput.value.trim();
  f.type = fieldTypeSelect.value as FieldType;
  f.description = fieldDescriptionInput.value.trim();
  f.verticalAlign = toVerticalAlign(fieldVerticalAlignSelect.value);
  renderFieldList();
}
