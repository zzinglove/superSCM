import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseImportFile } from './parse';
import { validateRows } from './validate';
import type { ImportMode, ImportType, ImportRow } from './types';

const RAW_TABLES: Record<ImportType, string> = { usage_history:'usage_history', inventory:'inventory', item_master:'item_master', supplier_master:'supplier_master', purchase_order:'purchase_order', goods_receipt:'goods_receipt', sales_order:'sales_order', business_event:'business_event' };
const LEGACY_COLUMNS: Record<string, Record<string, string>> = {
  inventory:{item_id:'품목코드',warehouse:'창고',current_stock:'현재고',as_of_date:'기준일자',safety_stock:'안전재고'},
  item_master:{item_id:'품목코드',item_name:'품목명',item_type:'품목구분',unit:'단위',unit_price:'표준단가',is_active:'사용여부',supplier_id:'supplier_id'},
  supplier_master:{supplier_id:'공급업체코드',supplier_name:'공급업체명',country:'국가',lead_time_days:'리드타임'},
  purchase_order:{po_id:'발주번호',order_date:'발주일',supplier_id:'공급업체',item_id:'품목코드',qty:'발주수량',unit_price:'단가',expected_date:'납기예정일',buyer:'발주담당'},
  goods_receipt:{receipt_id:'입고번호',po_id:'발주번호',item_id:'품목코드',qty:'입고수량',receipt_date:'입고일',warehouse:'입고창고'},
};
function rawRecord(type: ImportType, row: ImportRow, batchId: string, rowNumber: number) {
  const record: Record<string, unknown> = {};
  for (const [key,value] of Object.entries(row)) record[LEGACY_COLUMNS[type]?.[key] ?? key] = value;
  const source = row.usage_id ?? row.item_id ?? row.po_id ?? row.receipt_id ?? row.sales_order_id ?? row.event_id ?? row.supplier_id;
  record.batch_id = batchId; record.source_type = 'FILE_UPLOAD'; record.loaded_at = new Date().toISOString(); record.source_record_id = String(source ?? batchId + ':' + rowNumber);
  return record;
}
export async function createStagedBatch(input: { file: File; importType: ImportType; mode: ImportMode; userId: string }) {
  if (input.mode === 'replace') throw new Error('REPLACE_REQUIRES_MAINTENANCE');
  const supabase = await createSupabaseServerClient();
  const { data: savedMappings } = await supabase.schema("core").from("column_mapping").select("source_column,target_column,confidence").eq("import_type", input.importType);
  const parsed = await parseImportFile(input.file, input.importType, (savedMappings ?? []).map((entry) => ({ source:entry.source_column, target:entry.target_column, confidence:Number(entry.confidence ?? 0) })));
  const { data: batch, error } = await supabase.schema('core').from('upload_batch').insert({file_name:parsed.fileName,import_type:input.importType,import_mode:input.mode,total_rows:parsed.rows.length,uploaded_by:input.userId}).select('batch_id').single();
  if (error || !batch) throw new Error(error?.message ?? 'BATCH_CREATE_FAILED');
  const staging = parsed.originalRows.map((original,index)=>({batch_id:batch.batch_id,row_number:index+2,original_row:original,mapped_row:parsed.rows[index],row_status:'PENDING'}));
  if (staging.length) { const {error:stageError}=await supabase.schema('core').from('import_staging').insert(staging); if(stageError) throw new Error(stageError.message); }
  if (parsed.mapping.length) await supabase.schema("core").from("column_mapping").upsert(parsed.mapping.map((entry) => ({ import_type:input.importType, source_column:entry.source, target_column:entry.target, confidence:entry.confidence, saved_by:input.userId })));
  await supabase.schema("core").from("upload_batch").update({status:"PARSED"}).eq("batch_id",batch.batch_id);
  return {batchId:batch.batch_id,fileName:parsed.fileName,headers:parsed.headers,mapping:parsed.mapping,preview:parsed.rows.slice(0,100),totalRows:parsed.rows.length};
}
async function masterSets(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const [{data:items},{data:suppliers}] = await Promise.all([supabase.schema('core').from('v_item_master').select('item_id'),supabase.schema('raw').from('supplier_master').select('*')]);
  const supplierRows=(suppliers??[]) as Record<string,unknown>[];
  return {items:new Set((items??[]).map((row)=>String(row.item_id))),suppliers:new Set(supplierRows.map((row)=>String(row.supplier_id??row['공급업체코드']??'')).filter(Boolean))};
}
export async function validateBatch(batchId:string, customMapping?: {source:string;target:string}[]) {
  const supabase=await createSupabaseServerClient();
  const {data:batch}=await supabase.schema('core').from('upload_batch').select('*').eq('batch_id',batchId).single();
  if(!batch) throw new Error('BATCH_NOT_FOUND');
  const {data:stage,error:stageError}=await supabase.schema('core').from('import_staging').select('*').eq('batch_id',batchId).order('row_number');
  if(stageError) throw new Error(stageError.message);
  const mappedRows=(stage??[]).map((row)=>{ if(!customMapping?.length) return row.mapped_row as ImportRow; return Object.fromEntries(customMapping.map((entry)=>[entry.target,(row.original_row as ImportRow)[entry.source]])); });
  const result=validateRows(batch.import_type as ImportType,mappedRows,await masterSets(supabase));
  await supabase.schema('core').from('validation_error').delete().eq('batch_id',batchId);
  const errors=result.errors.map((error)=>({batch_id:batchId,row_number:error.rowNumber,field_name:error.field??null,error_code:error.code,error_message:error.message,severity:error.severity,original_value:error.originalValue==null?null:String(error.originalValue)}));
  if(errors.length){const {error}=await supabase.schema('core').from('validation_error').insert(errors);if(error)throw new Error(error.message);}
  for(const row of result.rows) await supabase.schema('core').from('import_staging').update({mapped_row:row.mapped,row_status:row.status}).eq('batch_id',batchId).eq('row_number',row.rowNumber);
  const status=result.status==='ERROR'?'VALIDATION_FAILED':'VALIDATED';
  await supabase.schema('core').from('upload_batch').update({status,success_rows:result.counts.success,warning_rows:result.counts.warning,error_rows:result.counts.error}).eq('batch_id',batchId);
  return {...result,batchId};
}
export async function commitBatch(batchId:string, replaceConfirmed=false) {
  const supabase=await createSupabaseServerClient();
  const {data:batch}=await supabase.schema('core').from('upload_batch').select('*').eq('batch_id',batchId).single();
  if(!batch)throw new Error('BATCH_NOT_FOUND');
  if(batch.status!=='VALIDATED')throw new Error('VALIDATION_REQUIRED');
  if(batch.import_mode==='replace')throw new Error('REPLACE_REQUIRES_MAINTENANCE');
  if(batch.import_mode==='replace'&&!replaceConfirmed)throw new Error('REPLACE_CONFIRMATION_REQUIRED');
  const {data:rows}=await supabase.schema('core').from('import_staging').select('row_number,mapped_row,row_status').eq('batch_id',batchId).in('row_status',['SUCCESS','WARNING']).order('row_number');
  const records=(rows??[]).map((row)=>rawRecord(batch.import_type as ImportType,row.mapped_row as ImportRow,batchId,row.row_number));
  if(records.length){const query=batch.import_mode==='upsert'?supabase.schema('raw').from(RAW_TABLES[batch.import_type as ImportType]).upsert(records,{onConflict:'source_record_id'}):supabase.schema('raw').from(RAW_TABLES[batch.import_type as ImportType]).insert(records);const {error}=await query;if(error)throw new Error(error.message);}
  if (["usage_history","sales_order","business_event"].includes(batch.import_type)) await supabase.schema("raw").from("forecast").update({stale:true}).not("품목코드","is",null);
  await supabase.schema('core').from('upload_batch').update({status:'IMPORTED',imported_at:new Date().toISOString(),replace_confirmed:false}).eq('batch_id',batchId);
  return {batchId,importedRows:records.length,rollbackSupported:true};
}
export async function rollbackBatch(batchId:string){const supabase=await createSupabaseServerClient();const {error}=await supabase.schema('core').rpc('rollback_import_batch',{p_batch_id:batchId});if(error)throw new Error(error.message);return {batchId,status:'ROLLED_BACK'};}
