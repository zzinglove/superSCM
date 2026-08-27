import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStockoutRisk } from './scm-model.ts';

test('normalizes stockout risk rows', () => {
  assert.deepEqual(normalizeStockoutRisk({
    item_id: 'ITEM001', item_name: 'A3 Printer Model A', supplier_name: 'Fujifilm BI Japan',
    current_stock: 120, inbound_qty: 30, available_qty: 150, daily_usage_avg: 5,
    planned_lead_time: 20, stockout_days: 30, stockout_date: '2026-10-01',
    risk_status: 'CRITICAL', reason: null,
  }), {
    itemId: 'ITEM001', itemName: 'A3 Printer Model A', supplier: 'Fujifilm BI Japan',
    currentStock: 120, inboundQty: 30, availableQty: 150, dailyUsageAvg: 5,
    plannedLeadTime: 20, stockoutDays: 30, stockoutDate: '2026-10-01',
    riskStatus: 'CRITICAL', reason: null,
  });
});

test('preserves unknown reasons without inventing numbers', () => {
  const result = normalizeStockoutRisk({ 품목코드: 'ITEM020', 품목명: '미사용 품목', 위험상태: 'UNKNOWN', 사유코드: 'NO_USAGE' });
  assert.equal(result.stockoutDays, null);
  assert.equal(result.riskStatus, 'UNKNOWN');
  assert.equal(result.reason, 'NO_USAGE');
});
