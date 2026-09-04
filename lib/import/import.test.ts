import test from 'node:test';
import assert from 'node:assert/strict';
import { inferColumnMapping } from './schema.ts';
import { toErrorCsv, validateRows } from './validate.ts';

const masters = { items: new Set(['ITEM001']), suppliers: new Set(['SUP001']) };

test('infers Korean usage columns without changing their values', () => {
  const mapping = inferColumnMapping(['품목코드', '출고일', '출고수량'], 'usage_history');
  assert.deepEqual(mapping.map((entry) => entry.target), ['item_id', 'use_date', 'qty']);
});

test('returns ERROR for missing required values, invalid dates, and unknown items', () => {
  const result = validateRows('usage_history', [
    { item_id: '', use_date: '2026-01-01', qty: '2' },
    { item_id: 'NOPE', use_date: 'not-a-date', qty: '2' },
  ], masters);
  assert.equal(result.status, 'ERROR');
  assert.ok(result.errors.some((error) => error.code === 'REQUIRED_VALUE'));
  assert.ok(result.errors.some((error) => error.code === 'INVALID_DATE'));
  assert.ok(result.errors.some((error) => error.code === 'UNKNOWN_ITEM'));
});

test('detects duplicates and preserves null instead of converting it to zero', () => {
  const result = validateRows('usage_history', [
    { item_id: 'ITEM001', use_date: '2026-01-01', qty: null },
    { item_id: 'ITEM001', use_date: '2026-01-01', qty: null },
  ], masters);
  assert.equal(result.rows[0].mapped.qty, null);
  assert.ok(result.errors.some((error) => error.code === 'DUPLICATE_ROW'));
});

test('serializes only error and warning rows with original values', () => {
  const csv = toErrorCsv([{
    rowNumber: 2,
    original: { 품목코드: 'NOPE', 출고수량: 'x' },
    mapped: {},
    errors: [{ code: 'UNKNOWN_ITEM', message: '품목이 없습니다.', severity: 'ERROR', field: 'item_id', originalValue: 'NOPE' }],
    status: 'ERROR',
  }]);
  assert.match(csv, /row_number/);
  assert.match(csv, /UNKNOWN_ITEM/);
  assert.match(csv, /NOPE/);
});
