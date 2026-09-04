import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInventoryProjection, normalizeLeadtimePolicy, normalizeStockoutRisk } from './scm-model.ts';

test('normalizes projection-based stockout risk rows', () => {
  assert.deepEqual(normalizeStockoutRisk({
    item_id: 'ITEM001', item_name: 'A3 Printer Model A', supplier_name: 'Fujifilm BI Japan',
    current_stock: 120, inbound_qty: 30, planned_lead_time: 20,
    days_of_supply: 30, months_of_supply: 1, stockout_date: '2026-10-01',
    risk_status: 'CRITICAL', reason_code: null,
  }), {
    itemId: 'ITEM001', itemName: 'A3 Printer Model A', supplier: 'Fujifilm BI Japan',
    currentStock: 120, inboundQty: 30, plannedLeadTime: 20, daysOfSupply: 30,
    monthsOfSupply: 1, stockoutDate: '2026-10-01', stockoutPeriod: null, riskStatus: 'CRITICAL', reasonCode: null,
  });
});

test('preserves calculation-unavailable reasons without inventing numbers', () => {
  const result = normalizeStockoutRisk({ 품목코드: 'ITEM020', 품목명: '미사용 품목', 위험상태: 'CALCULATION_UNAVAILABLE', 사유코드: 'NO_FORECAST' });
  assert.equal(result.daysOfSupply, null);
  assert.equal(result.riskStatus, 'CALCULATION_UNAVAILABLE');
  assert.equal(result.reasonCode, 'NO_FORECAST');
});

test('normalizes every inventory projection input and keeps absent soft allocation explicit', () => {
  assert.deepEqual(normalizeInventoryProjection({
    item_id: 'ITEM001', item_name: '품목', supplier_id: 'SUP001', period: '2026-10-01',
    beginning_inventory: 100, scheduled_receipt: 25, confirmed_sales_order: 10,
    soft_allocation: 0, soft_allocation_state: 'DATA_ABSENT', forecast_demand: 40,
    ending_projected_inventory: 75, stockout_period: null, stockout_date: null,
    days_of_supply: 75, months_of_supply: 2.5, risk_status: 'SAFE', reason_code: null,
  }), {
    itemId: 'ITEM001', itemName: '품목', supplierId: 'SUP001', period: '2026-10-01',
    beginningInventory: 100, scheduledReceipt: 25, confirmedSalesOrder: 10,
    softAllocation: 0, softAllocationState: 'DATA_ABSENT', forecastDemand: 40,
    endingProjectedInventory: 75, stockoutPeriod: null, stockoutDate: null,
    daysOfSupply: 75, monthsOfSupply: 2.5, riskStatus: 'SAFE', reasonCode: null,
  });
});

test('normalizes effective lead time policy and all percentile values', () => {
  assert.deepEqual(normalizeLeadtimePolicy({
    item_id: 'ITEM001', supplier_id: 'SUP001', supplier_name: '공급처',
    mean_days: 18, p50_days: 17, p80_days: 24, p90_days: 30,
    planned_lead_time: 20, effective_lead_time: 20, effective_from: '2026-09-01',
    updated_by: 'admin@example.com', source: 'ADMIN_CONFIRMED',
  }), {
    itemId: 'ITEM001', supplierId: 'SUP001', supplier: '공급처', actualLeadTime: 18,
    p50: 17, p80: 24, p90: 30, adminLeadTime: 20, effectiveLeadTime: 20,
    effectiveFrom: '2026-09-01', changedBy: 'admin@example.com', source: 'ADMIN_CONFIRMED',
  });
});
