import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePurchaseRecommendation, normalizeSafetyStock } from './scm-model.ts';

test('normalizes a purchase recommendation and preserves calculation trace', () => {
  const row = normalizePurchaseRecommendation({
    item_id: 'ITEM001', item_name: '품목', item_grade: 'A', forecast_qty: 600,
    confirmed_order_qty: 400, demand_basis_qty: 600, available_inventory: 250,
    scheduled_receipt: 150, safety_stock: 100, effective_leadtime: 20,
    stockout_date: '2026-10-01', safety_buffer_days: 5, required_qty: 300,
    moq: 200, pack_size: 50, recommended_qty: 300, recommended_order_date: '2026-09-06',
    risk_status: 'WARNING', calculation_status: 'SUCCESS', reason_code: null,
    forecast_run_id: 'run-1', model_version: '1.0.0', is_immediate: false, is_overdue: false,
    calculation_trace: { demand_basis: 600, safety_stock: 100, available_inventory: 250, open_po: 150, required: 300, moq: 200, pack_size: 50, recommended: 300 },
  });
  assert.equal(row.demandBasisQty, 600);
  assert.equal(row.recommendedQty, 300);
  assert.equal(row.calculationStatus, 'SUCCESS');
  assert.deepEqual(row.calculationTrace, { demand_basis: 600, safety_stock: 100, available_inventory: 250, open_po: 150, required: 300, moq: 200, pack_size: 50, recommended: 300 });
});

test('keeps no-order zero distinct from calculation-unavailable null', () => {
  const noOrder = normalizePurchaseRecommendation({ calculation_status: 'SUCCESS', recommended_qty: 0, reason_code: 'NO_ORDER' });
  const unavailable = normalizePurchaseRecommendation({ calculation_status: 'CALCULATION_UNAVAILABLE', recommended_qty: null, reason_code: 'NO_FORECAST' });
  assert.equal(noOrder.recommendedQty, 0);
  assert.equal(noOrder.calculationStatus, 'SUCCESS');
  assert.equal(unavailable.recommendedQty, null);
  assert.equal(unavailable.reasonCode, 'NO_FORECAST');
});

test('normalizes safety stock variables without calculating them in React', () => {
  const row = normalizeSafetyStock({
    item_id: 'ITEM001', item_grade: 'A', leadtime_days: 20, demand_daily: 30,
    forecast_error_sigma: 4, leadtime_sigma: 3, service_level: 0.95, z_value: 1.645,
    sigma_dlt: 22.4, safety_stock: 36.8, calculation_status: 'SUCCESS', reason_code: null,
  });
  assert.deepEqual(row, {
    itemId: 'ITEM001', itemGrade: 'A', leadtimeDays: 20, demandDaily: 30,
    forecastErrorSigma: 4, leadtimeSigma: 3, serviceLevel: 0.95, zValue: 1.645,
    sigmaDlt: 22.4, safetyStock: 36.8, calculationStatus: 'SUCCESS', reasonCode: null,
  });
});
