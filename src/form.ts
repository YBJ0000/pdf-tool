import { state } from './state.ts';
import type { FieldType } from './types.ts';

export function showForm(fieldFormEl: HTMLElement): void {
  fieldFormEl.classList.remove('hidden');
}

export function hideForm(
  fieldFormEl: HTMLElement,
  fieldNameInput: HTMLInputElement,
  fieldTypeSelect: HTMLSelectElement,
  fieldDescriptionInput: HTMLTextAreaElement
): void {
  fieldFormEl.classList.add('hidden');
  fieldNameInput.value = '';
  fieldTypeSelect.value = 'string';
  fieldDescriptionInput.value = '';
}

export function syncFormToField(
  fieldNameInput: HTMLInputElement,
  fieldTypeSelect: HTMLSelectElement,
  fieldDescriptionInput: HTMLTextAreaElement,
  renderFieldList: () => void
): void {
  if (state.selectedIndex < 0) return;
  const f = state.fields[state.selectedIndex];
  if (!f) return;
  f.name = fieldNameInput.value.trim();
  f.type = fieldTypeSelect.value as FieldType;
  f.description = fieldDescriptionInput.value.trim();
  renderFieldList();
}
