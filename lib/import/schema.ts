import type { ColumnMapping, ImportType } from './types.ts';
import { IMPORT_TYPES } from './types.ts';
export type FieldSpec = { name: string; required?: boolean; kind: 'text' | 'number' | 'date' };
export const IMPORT_SCHEMAS: Record<ImportType, FieldSpec[]> = {
  usage_history: [{name:'usage_id',kind:'text'},{name:'item_id',required:true,kind:'text'},{name:'use_date',required:true,kind:'date'},{name:'qty',required:true,kind:'number'},{name:'warehouse',kind:'text'},{name:'note',kind:'text'}],
  inventory: [{name:'item_id',required:true,kind:'text'},{name:'warehouse',kind:'text'},{name:'current_stock',required:true,kind:'number'},{name:'as_of_date',required:true,kind:'date'},{name:'safety_stock',kind:'number'}],
  item_master: [{name:'item_id',required:true,kind:'text'},{name:'item_name',required:true,kind:'text'},{name:'item_type',kind:'text'},{name:'unit',kind:'text'},{name:'unit_price',kind:'number'},{name:'is_active',kind:'text'},{name:'supplier_id',kind:'text'}],
  supplier_master: [{name:'supplier_id',required:true,kind:'text'},{name:'supplier_name',required:true,kind:'text'},{name:'country',kind:'text'},{name:'lead_time_days',kind:'number'}],
  purchase_order: [{name:'po_id',required:true,kind:'text'},{name:'order_date',required:true,kind:'date'},{name:'supplier_id',required:true,kind:'text'},{name:'item_id',required:true,kind:'text'},{name:'qty',required:true,kind:'number'},{name:'unit_price',kind:'number'},{name:'expected_date',kind:'date'},{name:'buyer',kind:'text'}],
  goods_receipt: [{name:'receipt_id',required:true,kind:'text'},{name:'po_id',kind:'text'},{name:'item_id',required:true,kind:'text'},{name:'qty',required:true,kind:'number'},{name:'receipt_date',required:true,kind:'date'},{name:'warehouse',kind:'text'}],
  sales_order: [{name:'sales_order_id',required:true,kind:'text'},{name:'order_date',required:true,kind:'date'},{name:'item_id',required:true,kind:'text'},{name:'qty',required:true,kind:'number'},{name:'customer_id',kind:'text'},{name:'requested_date',kind:'date'},{name:'status',kind:'text'}],
  business_event: [{name:'event_id',required:true,kind:'text'},{name:'event_type',required:true,kind:'text'},{name:'event_date',required:true,kind:'date'},{name:'item_id',kind:'text'},{name:'quantity',kind:'number'},{name:'customer_id',kind:'text'},{name:'note',kind:'text'}],
};
const ALIASES: Record<string, string[]> = {
  usage_id:['usage_id','사용량ID','사용기록ID'], item_id:['item_id','품목코드','품목ID','item code'], use_date:['use_date','출고일','사용일','출고일자'], qty:['qty','수량','출고수량','사용량'],
  warehouse:['warehouse','창고','입고창고'], note:['note','비고','메모'], current_stock:['current_stock','현재고'], as_of_date:['as_of_date','기준일자'], safety_stock:['safety_stock','안전재고'],
  item_name:['item_name','품목명'], item_type:['item_type','품목구분'], unit:['unit','단위'], unit_price:['unit_price','단가','표준단가'], is_active:['is_active','사용여부'], supplier_id:['supplier_id','공급처코드','공급업체코드','공급업체'],
  supplier_name:['supplier_name','공급처명','공급업체명'], country:['country','국가'], lead_time_days:['lead_time_days','리드타임','리드타임일수'],
  po_id:['po_id','발주번호'], order_date:['order_date','발주일','주문일'], expected_date:['expected_date','납기예정일'], buyer:['buyer','발주담당'], receipt_id:['receipt_id','입고번호'], receipt_date:['receipt_date','입고일'],
  sales_order_id:['sales_order_id','판매주문번호'], customer_id:['customer_id','고객코드'], requested_date:['requested_date','요청일'], status:['status','상태'],
  event_id:['event_id','이벤트ID'], event_type:['event_type','이벤트유형'], event_date:['event_date','이벤트일'], quantity:['quantity','이벤트수량'],
};
function normalize(value: string) { return value.trim().toLowerCase().replace(/[\s_\-]/g, ''); }
export function inferColumnMapping(headers: string[], importType: ImportType): ColumnMapping[] {
  if (!IMPORT_TYPES.includes(importType)) throw new Error('UNSUPPORTED_IMPORT_TYPE');
  return IMPORT_SCHEMAS[importType].flatMap((field) => {
    const aliases = [field.name, ...(ALIASES[field.name] ?? [])].map(normalize);
    const source = headers.find((header) => aliases.includes(normalize(header)));
    return source ? [{ source, target: field.name, confidence: source === field.name ? 1 : 0.9 }] : [];
  });
}
export function getFields(importType: ImportType) { return IMPORT_SCHEMAS[importType]; }
