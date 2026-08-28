import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComparisonSeries, normalizeChampionRow, normalizePerformanceRow } from './backtest-model.ts';

test('normalizes a perfect stored performance row without recalculating metrics', () => {
  const row = normalizePerformanceRow({ run_id: 'bt-1', model_id: 'MA_3M', item_id: 'SKU-1', wape: 0, mape: 0, bias: 0, rmse: 0, mae: 0, rank: 1, calculation_status: 'SUCCESS' });
  assert.equal(row.wape, 0);
  assert.equal(row.rank, 1);
  assert.equal(row.calculationStatus, 'SUCCESS');
});

test('preserves unavailable metric reason and champion candidate evidence', () => {
  const performance = normalizePerformanceRow({ item_id: 'SKU-1', model_id: 'MA_6M', wape: null, reason_code: 'ACTUAL_SUM_ZERO' });
  const champion = normalizeChampionRow({ item_id: 'SKU-1', champion_model_id: 'MA_3M', selection_method: 'AUTO', candidate_performance: [{ model_id: 'MA_6M', wape: null }], selection_reason: 'WAPE 최저' });
  assert.equal(performance.wape, null);
  assert.equal(performance.reasonCode, 'ACTUAL_SUM_ZERO');
  assert.equal(champion.candidatePerformance[0].wape, null);
});

test('builds comparison series from stored actual and forecast rows only', () => {
  const series = buildComparisonSeries([
    { period: '2026-06-01', actual: 10, modelId: 'MA_3M', p50: 9, p80: 12, p90: 14 },
    { period: '2026-07-01', actual: 11, modelId: 'MA_3M', p50: 10, p80: null, p90: null },
  ]);
  assert.deepEqual(series, [
    { period: '2026-06-01', actual: 10, forecasts: { MA_3M: 9 }, p80: 12, p90: 14 },
    { period: '2026-07-01', actual: 11, forecasts: { MA_3M: 10 }, p80: null, p90: null },
  ]);
});
