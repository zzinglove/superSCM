import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShipmentTrend } from './scm-model.ts';

test('normalizes the live shipment trend for 602K02693', () => {
  const result = normalizeShipmentTrend({
    item_code: '602K02693',
    n_months: 40,
    avg_3m: 779.0,
    avg_12m: 772.3,
    avg_6m: null,
    reason_code: null,
  });

  assert.equal(result.itemCode, '602K02693');
  assert.equal(result.nMonths, 40);
  assert.equal(result.avg3m, 779.0);
  assert.equal(result.avg12m, 772.3);
  assert.equal(result.avg6m, null);
});
