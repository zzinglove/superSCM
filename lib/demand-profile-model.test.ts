import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDemandProfile, DEMAND_TYPE_CODES } from './demand-profile-model.ts';

test('preserves the four SQL demand type codes', () => {
  assert.deepEqual(DEMAND_TYPE_CODES, ['SMOOTH','INTERMITTENT','ERRATIC','LUMPY']);
  assert.equal(normalizeDemandProfile({ item_id:'ITEM001', demand_type:'LUMPY' }).demandType, 'LUMPY');
});

test('preserves unavailable metrics and reason codes as null metadata', () => {
  const row = normalizeDemandProfile({ item_id:'ITEM002', item_name:null, adi:null, cv_squared:null, demand_type:null, seasonality:null, reason_code:'NO_DEMAND' });
  assert.equal(row.itemId, 'ITEM002');
  assert.equal(row.adi, null);
  assert.equal(row.cvSquared, null);
  assert.equal(row.seasonality, null);
  assert.equal(row.reasonCode, 'NO_DEMAND');
});

test('does not consume test-only or raw usage fields', () => {
  const row = normalizeDemandProfile({ item_id:'ITEM003', demand_type:'SMOOTH', use_date:'2026-08-01', test_qty:999 });
  assert.equal(row.demandType, 'SMOOTH');
  assert.equal('useDate' in row, false);
  assert.equal('testQty' in row, false);
});
