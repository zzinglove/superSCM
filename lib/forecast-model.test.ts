import test from 'node:test';
import assert from 'node:assert/strict';
import { BASELINE_MODEL_IDS, normalizeForecastModel, normalizeForecastResult, normalizeForecastRun } from './forecast-model.ts';

test('exposes only the five SQL baseline model codes', () => {
  assert.deepEqual(BASELINE_MODEL_IDS, ['MA_3M', 'MA_6M', 'WMA_3M', 'PY_SAME_MONTH', 'SEASONAL_NAIVE']);
});

test('preserves model config values and null parameters', () => {
  const model = normalizeForecastModel({ model_id: 'MA_3M', model_name: '3개월 이동평균', family: 'BASELINE', engine: 'SQL', version: '1.0.0', enabled: true, is_default: true, applicable_demand_type: ['SMOOTH'], parameters: { window: 3 } });
  assert.equal(model.modelId, 'MA_3M');
  assert.equal(model.parameters?.window, 3);
  assert.equal(normalizeForecastResult({ model_id: 'MA_3M', item_id: 'ITEM001', period: '2026-09-01', predicted_qty: null, p50: null, p80: null, p90: null, sigma: null, reason_code: 'INSUFFICIENT_HISTORY' }).p90, null);
});

test('preserves stale runs and does not consume raw or test fields', () => {
  const run = normalizeForecastRun({ run_id: 'run-1', status: 'SUCCESS', is_stale: true, n_items: 1, n_rows: 2, triggered_email: 'admin@example.com' });
  assert.equal(run.isStale, true);
  assert.equal(normalizeForecastResult({ run_id: 'run-1', raw_usage_history: 100, v_test_actual: 200, reason_code: 'SOURCE_NULL' }).reasonCode, 'SOURCE_NULL');
});
