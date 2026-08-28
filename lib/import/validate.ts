import type { ImportRow, ImportType, ValidationError, ValidationOptions, ValidationResult, ValidatedRow } from './types.ts';
import { getFields } from './schema.ts';
const blank = (value: unknown) => value === null || value === undefined || String(value).trim() === '';
const text = (value: unknown) => value === null || value === undefined ? '' : String(value).trim();
const keyFor = (type: ImportType, row: ImportRow) => {
  const key = type === 'usage_history' ? [row.item_id, row.use_date, row.warehouse] : type === 'inventory' ? [row.item_id, row.warehouse, row.as_of_date] : type === 'purchase_order' ? [row.po_id, row.item_id] : type === 'goods_receipt' ? [row.receipt_id, row.item_id] : type === 'sales_order' ? [row.sales_order_id, row.item_id] : type === 'business_event' ? [row.event_id] : type === 'item_master' ? [row.item_id] : [row.supplier_id];
  return key.map((part) => text(part)).join('|');
};
const parseDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(value)) && !Number.isNaN(Date.parse(text(value) + 'T00:00:00Z'));
const parseNumber = (value: unknown) => typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
function validateOne(type: ImportType, row: ImportRow, options: ValidationOptions, seen: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of getFields(type)) {
    const value = row[field.name];
    if (field.required && blank(value)) errors.push({ code:'REQUIRED_VALUE', message:'필수값이 없습니다.', severity:'ERROR', field:field.name, originalValue:value });
    if (!blank(value) && field.kind === 'date' && !parseDate(value)) errors.push({ code:'INVALID_DATE', message:'날짜 형식은 YYYY-MM-DD여야 합니다.', severity:'ERROR', field:field.name, originalValue:value });
    if (!blank(value) && field.kind === 'number' && !parseNumber(value)) errors.push({ code:'INVALID_NUMBER', message:'숫자 형식이 아닙니다.', severity:'ERROR', field:field.name, originalValue:value });
  }
  const item = text(row.item_id);
  if (item && options.items && !options.items.has(item)) errors.push({ code:'UNKNOWN_ITEM', message:'품목 마스터에 없는 품목입니다.', severity:'ERROR', field:'item_id', originalValue:row.item_id });
  const supplier = text(row.supplier_id);
  if (supplier && options.suppliers && !options.suppliers.has(supplier)) errors.push({ code:'UNKNOWN_SUPPLIER', message:'공급처 마스터에 없는 공급처입니다.', severity:'ERROR', field:'supplier_id', originalValue:row.supplier_id });
  const quantity = row.qty ?? row.quantity ?? row.current_stock;
  if (!blank(quantity) && parseNumber(quantity) && Number(quantity) < 0) errors.push({ code:'NEGATIVE_VALUE', message:'수량은 음수일 수 없습니다.', severity:'ERROR', field:'qty', originalValue:quantity });
  const key = keyFor(type, row);
  if (seen.has(key) || (options.existingKeys && options.existingKeys.has(key))) errors.push({ code:'DUPLICATE_ROW', message:'중복된 업무 키입니다.', severity:'ERROR', field:'source_record_id', originalValue:key });
  seen.add(key);
  if (type === 'goods_receipt' && row.receipt_date && row.order_date && text(row.receipt_date) < text(row.order_date)) errors.push({ code:'DATE_LOGIC_ERROR', message:'입고일은 발주일보다 빠를 수 없습니다.', severity:'ERROR', field:'receipt_date', originalValue:row.receipt_date });
  return errors;
}
export function validateRows(type: ImportType, rows: ImportRow[], options: ValidationOptions = {}): ValidationResult {
  const seen = new Set<string>();
  const resultRows: ValidatedRow[] = rows.map((original, index) => {
    const mapped = { ...original };
    const errors = validateOne(type, mapped, options, seen);
    const status = errors.some((error) => error.severity === 'ERROR') ? 'ERROR' : errors.length ? 'WARNING' : 'SUCCESS';
    return { rowNumber:index + 2, original, mapped, status, errors };
  });
  const errors = resultRows.flatMap((row) => row.errors.map((error) => ({ ...error, rowNumber:row.rowNumber })));
  return { status: errors.some((error) => error.severity === 'ERROR') ? 'ERROR' : errors.length ? 'WARNING' : 'SUCCESS', rows:resultRows, errors, counts:{ success:resultRows.filter((row) => row.status === 'SUCCESS').length, warning:resultRows.filter((row) => row.status === 'WARNING').length, error:resultRows.filter((row) => row.status === 'ERROR').length } };
}
export function toErrorCsv(rows: ValidatedRow[]) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row.original)))).concat(['row_number', 'error_code', 'error_message', 'severity']);
  const quote = (value: unknown) => { const escaped = String(value ?? '').replace(/"/g, '""'); return /[",\n]/.test(escaped) ? '"' + escaped + '"' : escaped; };
  const lines = [headers.join(',')];
  for (const row of rows.filter((entry) => entry.status !== 'SUCCESS')) for (const error of row.errors) lines.push([...headers.map((header) => row.original[header] ?? ''), row.rowNumber, error.code, error.message, error.severity].map(quote).join(','));
  return lines.join('\n');
}
