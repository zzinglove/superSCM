export const BASELINE_MODEL_IDS = ['MA_3M', 'MA_6M', 'WMA_3M', 'PY_SAME_MONTH', 'SEASONAL_NAIVE'] as const;
export type BaselineModelId = typeof BASELINE_MODEL_IDS[number];
export type ForecastModel = { modelId: BaselineModelId | string; modelName: string; family: string; engine: string; version: string; enabled: boolean; isDefault: boolean; applicableDemandType: string[]; parameters: Record<string, unknown> | null; description: string | null };
export type ForecastRun = { runId: string; status: string; granularity: string | null; trainStart: string | null; trainEnd: string | null; horizon: number | null; dataSnapshotAt: string | null; isStale: boolean | null; nModels: number | null; nItems: number | null; nRows: number | null; triggeredBy: string | null; triggeredEmail: string | null; message: string | null };
export type ForecastResult = { runId: string | null; modelId: string | null; itemId: string | null; period: string | null; modelVersion: string | null; predictedQty: number | null; p50: number | null; p80: number | null; p90: number | null; sigma: number | null; basis: string | null; reasonCode: string | null };
function value(row: Record<string, unknown>, key: string) { return row[key] === undefined || row[key] === null ? null : row[key]; }
function numberValue(row: Record<string, unknown>, key: string) { const raw = value(row, key); if (raw === null) return null; const number = Number(raw); return Number.isFinite(number) ? number : null; }
function stringValue(row: Record<string, unknown>, key: string) { const raw = value(row, key); return raw === null ? null : String(raw); }
function booleanValue(row: Record<string, unknown>, key: string) { const raw = value(row, key); return typeof raw === 'boolean' ? raw : null; }
export function normalizeForecastModel(row: Record<string, unknown>): ForecastModel {
  const rawTypes = value(row, 'applicable_demand_type');
  return { modelId: stringValue(row, 'model_id') ?? 'UNKNOWN', modelName: stringValue(row, 'model_name') ?? '미정', family: stringValue(row, 'family') ?? '미정', engine: stringValue(row, 'engine') ?? '미정', version: stringValue(row, 'version') ?? '미정', enabled: booleanValue(row, 'enabled') ?? false, isDefault: booleanValue(row, 'is_default') ?? false, applicableDemandType: Array.isArray(rawTypes) ? rawTypes.map(String) : [], parameters: value(row, 'parameters') as Record<string, unknown> | null, description: stringValue(row, 'description') };
}
export function normalizeForecastRun(row: Record<string, unknown>): ForecastRun {
  return { runId: stringValue(row, 'run_id') ?? '미정', status: stringValue(row, 'status') ?? 'FAILED', granularity: stringValue(row, 'granularity'), trainStart: stringValue(row, 'train_start'), trainEnd: stringValue(row, 'train_end'), horizon: numberValue(row, 'horizon'), dataSnapshotAt: stringValue(row, 'data_snapshot_at'), isStale: booleanValue(row, 'is_stale'), nModels: numberValue(row, 'n_models'), nItems: numberValue(row, 'n_items'), nRows: numberValue(row, 'n_rows'), triggeredBy: stringValue(row, 'triggered_by'), triggeredEmail: stringValue(row, 'triggered_email'), message: stringValue(row, 'message') };
}
export function normalizeForecastResult(row: Record<string, unknown>): ForecastResult {
  return { runId: stringValue(row, 'run_id'), modelId: stringValue(row, 'model_id'), itemId: stringValue(row, 'item_id'), period: stringValue(row, 'period'), modelVersion: stringValue(row, 'model_version'), predictedQty: numberValue(row, 'predicted_qty'), p50: numberValue(row, 'p50'), p80: numberValue(row, 'p80'), p90: numberValue(row, 'p90'), sigma: numberValue(row, 'sigma'), basis: stringValue(row, 'basis'), reasonCode: stringValue(row, 'reason_code') };
}
