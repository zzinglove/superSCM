'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
export async function runBaselineForecast() { await requireAdmin(); const s=await createSupabaseServerClient(); const {data,error}=await s.schema('core').rpc('run_baseline_forecast'); if(error) redirect('/admin/forecast-runs?error='+encodeURIComponent(error.message)); revalidatePath('/admin/forecast-runs'); const result=Array.isArray(data)?data[0]:data; redirect('/admin/forecast-runs?run_id='+(result?.run_id ?? '')); }
export async function updateForecastModel(formData:FormData) { await requireAdmin(); const modelId=String(formData.get('model_id')??''); const enabled=String(formData.get('enabled')??'')==='true'; if(!modelId) redirect('/admin/forecast-models?error=invalid'); const s=await createSupabaseServerClient(); const {error}=await s.schema('core').from('model_config').update({enabled}).eq('model_id',modelId); if(error) redirect('/admin/forecast-models?error='+encodeURIComponent(error.message)); revalidatePath('/admin/forecast-models'); redirect('/admin/forecast-models?updated=1'); }
