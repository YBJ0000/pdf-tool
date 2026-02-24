import { state } from './state.ts';
import type { FieldsExport, FieldType } from './types.ts';

const FIELD_TYPES: FieldType[] = ['string', 'number', 'date', 'boolean', 'checkbox'];
function toFieldType(s: string): FieldType {
  return FIELD_TYPES.includes(s as FieldType) ? (s as FieldType) : 'string';
}

/** 按 mission 格式导出 JSON 并下载 */
export function exportJson(setStatus: (t: string) => void): void {
  const payload: FieldsExport = {
    fields: state.fields.map((f) => ({
      name: f.name ?? '',
      type: f.type ?? 'string',
      description: f.description ?? '',
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      page: f.page,
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
  setStatus('已导出 ' + state.fields.length + ' 个字段');
}

/** 导入已保存的 JSON，替换当前字段列表；若已加载 PDF 会重绘 overlay */
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
        setStatus('导入失败：JSON 需包含 fields 数组');
        return;
      }
      const fields = (payload as FieldsExport).fields;
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
        });
      }
      state.selectedIndex = -1;
      onLoaded(state.fields.length);
      setStatus('已导入 ' + state.fields.length + ' 个字段');
    } catch (err) {
      setStatus('导入失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };
  reader.readAsText(file);
}
