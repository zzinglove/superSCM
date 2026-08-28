export type PerformanceRow = {
  runId: string | null; modelId: string | null; modelVersion: string | null; itemId: string | null;
  nPeriods: number | null; wape: number | null; mape: number | null; bias: number | null;
  rmse: number | null; mae: number | null; baselineImprovement: number | null; rank: number | null;
  calculationStatus: string | null; reasonCode: string | null;
};
export type ChampionRow = {
  itemId: string | null; championModelId: string | null; modelVersion: string | null;
  championMetric: string | null; championMetricValue: number | null; wape: number | null;
  mape: number | null; bias: number | null; rmse: number | null; candidatePerformance: Array<Record<string, unknown>>;
  selectionReason: string | null; selectionMethod: 'AUTO' | 'MANUAL' | null; selectedAt: string | null;
};
export type ComparisonInput = { period: string; actual: number | null; modelId: string; p50: number | null; p80: number | null; p90: number | null };
export type ComparisonSeries = { period: string; actual: number | null; forecasts: Record<string, number>; p80: number | null; p90: number | null };

function raw(row: Record<string, unknown>, key: string) { return row[key] === undefined || row[key] === null ? null : row[key]; }
function text(row: Record<string, unknown>, key: string) { const v = raw(row, key); return v === null ? null : String(v); }
function number(row: Record<string, unknown>, key: string) { const v = raw(row, key); if (v === null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
export function normalizePerformanceRow(row: Record<string, unknown>): PerformanceRow {
  return { runId: text(row, 'run_id'), modelId: text(row, 'model_id'), modelVersion: text(row, 'model_version'), itemId: text(row, 'item_id'), nPeriods: number(row, 'n_periods'), wape: number(row, 'wape'), mape: number(row, 'mape'), bias: number(row, 'bias'), rmse: number(row, 'rmse'), mae: number(row, 'mae'), baselineImprovement: number(row, 'baseline_improvement'), rank: number(row, 'rank'), calculationStatus: text(row, 'calculation_status'), reasonCode: text(row, 'reason_code') };
}
export function normalizeChampionRow(row: Record<string, unknown>): ChampionRow {
  const candidates = raw(row, 'candidate_performance');
  return { itemId: text(row, 'item_id'), championModelId: text(row, 'champion_model_id'), modelVersion: text(row, 'model_version'), championMetric: text(row, 'champion_metric'), championMetricValue: number(row, 'champion_metric_value'), wape: number(row, 'wape'), mape: number(row, 'mape'), bias: number(row, 'bias'), rmse: number(row, 'rmse'), candidatePerformance: Array.isArray(candidates) ? candidates as Array<Record<string, unknown>> : [], selectionReason: text(row, 'selection_reason'), selectionMethod: text(row, 'selection_method') as ChampionRow['selectionMethod'], selectedAt: text(row, 'selected_at') };
}
export function buildComparisonSeries(rows: ComparisonInput[]): ComparisonSeries[] {
  const byPeriod = new Map<string, ComparisonSeries>();
  for (const row of rows) {
    const current = byPeriod.get(row.period) ?? { period: row.period, actual: row.actual, forecasts: {}, p80: row.p80, p90: row.p90 };
    if (current.actual === null) current.actual = row.actual;
    if (current.p80 === null) current.p80 = row.p80;
    if (current.p90 === null) current.p90 = row.p90;
    if (row.p50 !== null) current.forecasts[row.modelId] = row.p50;
    byPeriod.set(row.period, current);
  }
  return Array.from(byPeriod.values()).sort((a, b) => a.period.localeCompare(b.period));
}
