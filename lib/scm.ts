import { createSupabaseServerClient } from './supabase';
import { normalizeBomRequirement, normalizeDemandProfileRt, normalizeInventoryProjection, normalizeLeadtimeGap, normalizeLeadtimePolicy, normalizeOlAccuracy, normalizePurchaseRecommendation, normalizeSafetyStock, normalizeShipmentTrend, normalizeStockoutRisk, type BomRequirement, type DemandProfileRt, type InventoryProjection, type LeadtimeGap, type LeadtimePolicy, type OlAccuracy, type PurchaseRecommendation, type SafetyStock, type ShipmentTrend, type StockoutRisk } from './scm-model';

export async function getLeadtimeGap(): Promise<{ rows: LeadtimeGap[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_leadtime_gap').select('*');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeLeadtimeGap(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getStockoutKpi() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_stockout_kpi').select('*').maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getStockoutRisk(): Promise<{ rows: StockoutRisk[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_stockout_risk').select('*');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeStockoutRisk(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getInventoryProjection(): Promise<{ rows: InventoryProjection[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_inventory_projection').select('*').order('item_id').order('period');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeInventoryProjection(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getLeadtimePolicies(): Promise<{ rows: LeadtimePolicy[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('core').from('v_leadtime_effective').select('*').order('supplier_id');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeLeadtimePolicy(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getLeadtimeHistory(): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('core').from('leadtime_plan_history').select('*').order('changed_at', { ascending: false });
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []) as Record<string, unknown>[], error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getSafetyStock(itemId?: string): Promise<{ rows: SafetyStock[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_safety_stock').select('*').order('item_id');
    if (itemId) query = query.eq('item_id', itemId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeSafetyStock(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getPurchaseRecommendations(itemId?: string): Promise<{ rows: PurchaseRecommendation[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_purchase_recommendation').select('*').order('risk_status').order('item_id');
    if (itemId) query = query.eq('item_id', itemId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizePurchaseRecommendation(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getShipmentTrend(itemCode?: string): Promise<{ rows: ShipmentTrend[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_shipment_trend').select('*').order('item_code');
    if (itemCode) query = query.eq('item_code', itemCode);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeShipmentTrend(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getDemandProfileRt(itemCode?: string): Promise<{ rows: DemandProfileRt[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_item_demand_profile').select('*').order('item_code');
    if (itemCode) query = query.eq('item_code', itemCode);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeDemandProfileRt(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getOlAccuracy(modelBase?: string): Promise<{ rows: OlAccuracy[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let detailQuery = supabase.schema('analytics').from('v_ol_accuracy').select('*').order('model_base');
    let fiscalYearQuery = supabase.schema('analytics').from('v_ol_accuracy_fy').select('*').order('model_base');
    if (modelBase) {
      detailQuery = detailQuery.eq('model_base', modelBase);
      fiscalYearQuery = fiscalYearQuery.eq('model_base', modelBase);
    }
    const [detailResult, fiscalYearResult] = await Promise.all([detailQuery, fiscalYearQuery]);
    if (detailResult.error) return { rows: [], error: detailResult.error.message };
    if (fiscalYearResult.error) return { rows: [], error: fiscalYearResult.error.message };
    return {
      rows: [
        ...(detailResult.data ?? []).map((row) => normalizeOlAccuracy(row as Record<string, unknown>, 'MODEL')),
        ...(fiscalYearResult.data ?? []).map((row) => normalizeOlAccuracy(row as Record<string, unknown>, 'FY')),
      ],
      error: null,
    };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getBomRequirement(modelBase: string): Promise<{ rows: BomRequirement[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_bom_requirement_x').select('*').eq('model_base', modelBase);
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeBomRequirement(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}
