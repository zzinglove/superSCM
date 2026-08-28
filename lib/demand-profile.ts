import { createSupabaseServerClient } from './supabase/server';
import { normalizeDemandProfile, type DemandProfile } from './demand-profile-model';
export async function getDemandProfiles():Promise<{rows:DemandProfile[];error:string|null}>{
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.schema('analytics').from('v_sku_demand_profile').select('*').order('item_id');
  if(error)return {rows:[],error:error.message};
  return {rows:(data??[]).map((row)=>normalizeDemandProfile(row as Record<string,unknown>)),error:null};
}
export async function getDemandProfileKpi(){
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.schema('analytics').from('v_demand_profile_kpi').select('*').maybeSingle();
  return {data,error:error?.message??null};
}
