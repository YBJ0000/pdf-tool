import { state, defaultExportOptions } from './state.ts';
import type { FieldsExport, FieldType, ExportOptions, VerticalAlign } from './types.ts';

const FIELD_TYPES: FieldType[] = ['string', 'number', 'date', 'boolean', 'checkbox'];
function toFieldType(s: string): FieldType {
  return FIELD_TYPES.includes(s as FieldType) ? (s as FieldType) : 'string';
}

const VERTICAL_ALIGNS: VerticalAlign[] = ['top', 'middle', 'bottom'];
function toVerticalAlign(s: string): VerticalAlign {
  return VERTICAL_ALIGNS.includes(s as VerticalAlign) ? (s as VerticalAlign) : 'middle';
}

/** Export JSON in mission format and download (scale, checkboxSymbol, fontSize, fontColor, paddingX, paddingY, fields) */
export function exportJson(setStatus: (t: string) => void, options: ExportOptions): void {
  const payload: FieldsExport = {
    scale: state.pdfScale,
    checkboxSymbol: options.checkboxSymbol,
    fontSize: options.fontSize,
    fontColor: options.fontColor,
    paddingX: options.paddingX,
    paddingY: options.paddingY,
    fields: state.fields.map((f) => ({
      name: f.name ?? '',
      type: f.type ?? 'string',
      description: f.description ?? '',
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      page: f.page,
      verticalAlign: f.verticalAlign ?? 'middle',
    })),
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fields.json';
  a.click();
  URL.revokeObjectURL(url);
  setStatus('Exported ' + state.fields.length + ' field(s)');
}

/** Import saved JSON, replace current field list; redraw overlay if PDF is loaded */
export function importJson(
  file: File,
  setStatus: (t: string) => void,
  onLoaded: (count: number) => void
): void {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result as string) as FieldsExport | unknown;
      if (!payload || !Array.isArray((payload as FieldsExport).fields)) {
        setStatus('Import failed: JSON must contain a fields array');
        return;
      }
      const data = payload as FieldsExport;
      const fields = data.fields;
      state.fields.length = 0;
      for (const item of fields) {
        state.fields.push({
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
          width: Number(item.width) || 0,
          height: Number(item.height) || 0,
          page: Math.max(1, parseInt(String(item.page), 10) || 1),
          name: typeof item.name === 'string' ? item.name : '',
          type: toFieldType(typeof item.type === 'string' ? item.type : 'string'),
          description: typeof item.description === 'string' ? item.description : '',
          verticalAlign: toVerticalAlign(typeof item.verticalAlign === 'string' ? item.verticalAlign : 'middle'),
        });
      }
      if (data.checkboxSymbol !== undefined || data.fontSize !== undefined || data.fontColor !== undefined || data.paddingX !== undefined || data.paddingY !== undefined) {
        state.exportOptions = {
          checkboxSymbol: typeof data.checkboxSymbol === 'string' ? data.checkboxSymbol : defaultExportOptions.checkboxSymbol,
          fontSize: typeof data.fontSize === 'number' && data.fontSize >= 0 ? data.fontSize : defaultExportOptions.fontSize,
          fontColor: typeof data.fontColor === 'string' ? data.fontColor : defaultExportOptions.fontColor,
          paddingX: typeof data.paddingX === 'number' && data.paddingX >= 0 ? data.paddingX : defaultExportOptions.paddingX,
          paddingY: typeof data.paddingY === 'number' && data.paddingY >= 0 ? data.paddingY : defaultExportOptions.paddingY,
        };
      }
      state.selectedIndex = -1;
      onLoaded(state.fields.length);
      setStatus('Imported ' + state.fields.length + ' field(s)');
    } catch (err) {
      setStatus('Import failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };
  reader.readAsText(file);
}
