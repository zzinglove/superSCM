import { createSupabaseServerClient } from '@/lib/supabase/server';
export async function getImportHistory() {
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.schema('core').from('upload_batch').select('batch_id,file_name,import_type,import_mode,total_rows,success_rows,warning_rows,error_rows,status,uploaded_by,uploaded_at,imported_at,rollback_supported').order('uploaded_at',{ascending:false});
  if(error)throw new Error(error.message); return data??[];
}
export async function getValidationErrors(batchId:string) {
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.schema('core').from('validation_error').select('*').eq('batch_id',batchId).order('row_number');
  if(error)throw new Error(error.message); return data??[];
}
