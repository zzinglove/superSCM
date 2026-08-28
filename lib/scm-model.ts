export type LeadtimeGap = {
  supplier: string;
  country: string;
  masterLeadTime: number | null;
  sampleCount: number;
  actualAverage: number | null;
  p80: number | null;
  gap: number | null;
};
//leadtimeGap은 이런 데이터 형태로 뿌려랏


function value(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

function numberValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLeadtimeGap(row: Record<string, unknown>): LeadtimeGap {
  return {
    supplier: String(value(row, ['supplier_name', 'supplier', '법인', '공급처', '공급업체명']) ?? '미정'),
    country: String(value(row, ['country', '국가']) ?? '미정'),
    masterLeadTime: numberValue(row, ['std_lead_time', 'master_lt', 'master_lead_time', 'planned_lead_time', '표준리드타임', '표준리드타임(일)', '마스터값']),
    sampleCount: numberValue(row, ['n_samples', 'sample_count', 'samples', '표본수']) ?? 0,
    actualAverage: numberValue(row, ['mean_days', 'actual_avg', 'actual_average', 'avg_lead_time', '실적평균']),
    p80: numberValue(row, ['p80_days', 'p80', 'P80']),
    gap: numberValue(row, ['gap_days', 'gap', 'leadtime_gap', '격차']),
  };
}

export type StockoutRisk = {
  itemId: string; itemName: string; supplier: string;
  currentStock: number | null; inboundQty: number | null; availableQty: number | null;
  dailyUsageAvg: number | null; plannedLeadTime: number | null; stockoutDays: number | null;
  stockoutDate: string | null; riskStatus: 'SAFE' | 'CRITICAL' | 'UNKNOWN';
  reason: 'NO_USAGE' | 'NO_LEADTIME' | null;
};

export function normalizeStockoutRisk(row: Record<string, unknown>): StockoutRisk {
  const pick = (keys: string[]) => keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== '') ?? null;
  const numberValue = (keys: string[]) => { const raw = pick(keys); if (raw === null) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; };
  const riskStatus = String(pick(['risk_status', 'status', '위험상태']) ?? 'UNKNOWN').toUpperCase();
  const reason = pick(['reason', 'reason_code', '사유코드']);
  const stockoutDate = pick(['stockout_date', '소진예상일', '소진예정일']);
  return {
    itemId: String(pick(['item_id', 'item_code', '품목코드']) ?? '미정'),
    itemName: String(pick(['item_name', '품목명']) ?? '미정'),
    supplier: String(pick(['supplier_name', 'supplier', '법인', '공급처']) ?? '미정'),
    currentStock: numberValue(['current_stock', 'stock_on_hand', '현재고']),
    inboundQty: numberValue(['inbound_qty', 'inbound', '입고예정']),
    availableQty: numberValue(['available_qty', 'available', '가용수량']),
    dailyUsageAvg: numberValue(['daily_usage_avg', 'daily_avg', '일평균사용량']),
    plannedLeadTime: numberValue(['planned_lead_time', 'lead_time', '계획리드타임']),
    stockoutDays: numberValue(['stockout_days', '소진일수', '소진예상일수']),
    stockoutDate: stockoutDate === null ? null : String(stockoutDate),
    riskStatus: riskStatus === 'SAFE' || riskStatus === 'CRITICAL' ? riskStatus : 'UNKNOWN',
    reason: reason === 'NO_USAGE' || reason === 'NO_LEADTIME' ? reason : null,
  };
}
