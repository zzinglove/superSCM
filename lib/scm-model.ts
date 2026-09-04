export type LeadtimeGap = {
  supplier: string;
  country: string;
  masterLeadTime: number | null;
  sampleCount: number;
  actualAverage: number | null;
  p80: number | null;
  gap: number | null;
};

export type RiskStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'CALCULATION_UNAVAILABLE';
export type CalculationReason = 'NO_USAGE_HISTORY' | 'NO_LEADTIME' | 'NO_INVENTORY_DATA' | 'INSUFFICIENT_SAMPLE' | 'NO_FORECAST' | string;

export type LeadtimePolicy = {
  itemId: string | null;
  supplierId: string;
  supplier: string;
  actualLeadTime: number | null;
  p50: number | null;
  p80: number | null;
  p90: number | null;
  adminLeadTime: number | null;
  effectiveLeadTime: number | null;
  effectiveFrom: string | null;
  changedBy: string | null;
  source: string | null;
};

export type InventoryProjection = {
  itemId: string;
  itemName: string;
  supplierId: string | null;
  period: string | null;
  beginningInventory: number | null;
  scheduledReceipt: number | null;
  confirmedSalesOrder: number | null;
  softAllocation: number | null;
  softAllocationState: 'OBSERVED' | 'DATA_ABSENT' | string | null;
  forecastDemand: number | null;
  endingProjectedInventory: number | null;
  stockoutPeriod: string | null;
  stockoutDate: string | null;
  daysOfSupply: number | null;
  monthsOfSupply: number | null;
  riskStatus: RiskStatus;
  reasonCode: CalculationReason | null;
};

export type SafetyStock = {
  itemId: string;
  itemGrade: string | null;
  leadtimeDays: number | null;
  demandDaily: number | null;
  forecastErrorSigma: number | null;
  leadtimeSigma: number | null;
  serviceLevel: number | null;
  zValue: number | null;
  sigmaDlt: number | null;
  safetyStock: number | null;
  calculationStatus: 'SUCCESS' | 'CALCULATION_UNAVAILABLE' | string;
  reasonCode: string | null;
};

export type PurchaseRecommendation = {
  itemId: string;
  itemName: string;
  itemGrade: string | null;
  forecastQty: number | null;
  confirmedOrderQty: number | null;
  demandBasisQty: number | null;
  availableInventory: number | null;
  scheduledReceipt: number | null;
  safetyStock: number | null;
  effectiveLeadtime: number | null;
  stockoutDate: string | null;
  safetyBufferDays: number | null;
  requiredQty: number | null;
  moq: number | null;
  packSize: number | null;
  recommendedQty: number | null;
  recommendedOrderDate: string | null;
  riskStatus: RiskStatus;
  calculationStatus: 'SUCCESS' | 'CALCULATION_UNAVAILABLE' | string;
  reasonCode: string | null;
  forecastRunId: string | null;
  modelVersion: string | null;
  isImmediate: boolean | null;
  isOverdue: boolean | null;
  orderTimingStatus: string | null;
  calculationTrace: Record<string, unknown> | null;
};

export type ShipmentTrend = {
  itemCode: string;
  itemName: string | null;
  period: string | null;
  shipmentQty: number | null;
  avg3m: number | null;
  avg6m: number | null;
  avg12m: number | null;
  nMonths: number | null;
  reasonCode: string | null;
};

export type DemandProfileRt = {
  itemCode: string;
  itemName: string | null;
  adi: number | null;
  cvSquared: number | null;
  noDemandRate: number | null;
  demandType: string | null;
  reasonCode: string | null;
};

export type OlAccuracy = {
  modelBase: string | null;
  modelId: string | null;
  fiscalYear: string | null;
  scope: 'MODEL' | 'FY';
  salesWape: number | null;
  salesBias: number | null;
  scmWape: number | null;
  scmBias: number | null;
  sampleCount: number | null;
  reasonCode: string | null;
};

export type BomRequirement = {
  modelBase: string;
  itemCode: string | null;
  itemName: string | null;
  quantity: number | null;
  cap: number | null;
  neutral: number | null;
  mustOption: number | null;
  sccLabel: number | null;
  bom: number | null;
  reasonCode: string | null;
};

function nullableText(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  return raw === null ? null : String(raw);
}

export function normalizeShipmentTrend(row: Record<string, unknown>): ShipmentTrend {
  return {
    itemCode: String(value(row, ['item_code', 'item_id', 'sku', '품목코드']) ?? '미정'),
    itemName: nullableText(row, ['item_name', '품목명']),
    period: nullableText(row, ['period', 'month', 'month_start', '기준월']),
    shipmentQty: numberValue(row, ['shipment_qty', 'shipped_qty', 'quantity', '출고수량']),
    avg3m: numberValue(row, ['avg_3m', 'average_3m', '3m_avg']),
    avg6m: numberValue(row, ['avg_6m', 'average_6m', '6m_avg']),
    avg12m: numberValue(row, ['avg_12m', 'average_12m', '12m_avg']),
    nMonths: numberValue(row, ['n_months', 'months_count', '관측개월수']),
    reasonCode: nullableText(row, ['reason_code', 'reason', '사유코드']),
  };
}

export function normalizeDemandProfileRt(row: Record<string, unknown>): DemandProfileRt {
  return {
    itemCode: String(value(row, ['item_code', 'item_id', 'sku', '품목코드']) ?? '미정'),
    itemName: nullableText(row, ['item_name', '품목명']),
    adi: numberValue(row, ['adi', 'ADI']),
    cvSquared: numberValue(row, ['cv_squared', 'cv2', 'cv_sq', 'CV²']),
    noDemandRate: numberValue(row, ['no_demand_rate', 'zero_demand_rate', '무수요율']),
    demandType: nullableText(row, ['demand_type', '수요유형']),
    reasonCode: nullableText(row, ['reason_code', 'reason', '사유코드']),
  };
}

export function normalizeOlAccuracy(row: Record<string, unknown>, scope: 'MODEL' | 'FY'): OlAccuracy {
  return {
    modelBase: nullableText(row, ['model_base', 'model_base_name', '기종']),
    modelId: nullableText(row, ['model_id', 'model_version', '모델']),
    fiscalYear: nullableText(row, ['fiscal_year', 'fy', '회계연도']),
    scope,
    salesWape: numberValue(row, ['sales_wape', 'sales_wape_pct', 'sales_wape_percent']),
    salesBias: numberValue(row, ['sales_bias']),
    scmWape: numberValue(row, ['scm_wape', 'scm_wape_pct', 'scm_wape_percent']),
    scmBias: numberValue(row, ['scm_bias']),
    sampleCount: numberValue(row, ['n_samples', 'sample_count', 'samples']),
    reasonCode: nullableText(row, ['reason_code', 'reason', '사유코드']),
  };
}

export function normalizeBomRequirement(row: Record<string, unknown>): BomRequirement {
  return {
    modelBase: String(value(row, ['model_base', 'model', '기종']) ?? '미정'),
    itemCode: nullableText(row, ['item_code', 'item_id', 'component_item_code', '품목코드']),
    itemName: nullableText(row, ['item_name', 'component_item_name', '품목명']),
    quantity: numberValue(row, ['quantity', 'qty', 'requirement_qty', '소요량']),
    cap: numberValue(row, ['cap', 'CAP']),
    neutral: numberValue(row, ['neutral', 'NEUTRAL']),
    mustOption: numberValue(row, ['must_option', 'MUST_OPTION']),
    sccLabel: numberValue(row, ['scc_label', 'SCC_LABEL']),
    bom: numberValue(row, ['bom', 'BOM']),
    reasonCode: nullableText(row, ['reason_code', 'reason', '사유코드']),
  };
}
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
  currentStock: number | null; inboundQty: number | null;
  plannedLeadTime: number | null; daysOfSupply: number | null; monthsOfSupply: number | null;
  stockoutDate: string | null; stockoutPeriod: string | null;
  riskStatus: RiskStatus; reasonCode: CalculationReason | null;
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
    plannedLeadTime: numberValue(['planned_lead_time', 'lead_time', '계획리드타임']),
    daysOfSupply: numberValue(['days_of_supply', 'stockout_days', '소진일수', '소진예상일수']),
    monthsOfSupply: numberValue(['months_of_supply', '재고개월수']),
    stockoutDate: stockoutDate === null ? null : String(stockoutDate),
    stockoutPeriod: String(pick(['stockout_period', '소진기간']) ?? '') || null,
    riskStatus: riskStatus === 'SAFE' || riskStatus === 'WARNING' || riskStatus === 'CRITICAL' || riskStatus === 'CALCULATION_UNAVAILABLE' ? riskStatus : 'CALCULATION_UNAVAILABLE',
    reasonCode: reason === null ? null : String(reason),
  };
}

export function normalizeInventoryProjection(row: Record<string, unknown>): InventoryProjection {
  const pick = (keys: string[]) => keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== '') ?? null;
  const numberValue = (keys: string[]) => { const raw = pick(keys); if (raw === null) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; };
  const status = String(pick(['risk_status', 'status', '위험상태']) ?? 'CALCULATION_UNAVAILABLE').toUpperCase();
  return {
    itemId: String(pick(['item_id', 'item_code', '품목코드']) ?? '미정'), itemName: String(pick(['item_name', '품목명']) ?? '미정'),
    supplierId: pick(['supplier_id', '공급처코드']) === null ? null : String(pick(['supplier_id', '공급처코드'])), period: pick(['period', '기간']) === null ? null : String(pick(['period', '기간'])),
    beginningInventory: numberValue(['beginning_inventory', '시작재고']), scheduledReceipt: numberValue(['scheduled_receipt', '입고예정']),
    confirmedSalesOrder: numberValue(['confirmed_sales_order', '확정수주']), softAllocation: numberValue(['soft_allocation', '가예약']),
    softAllocationState: pick(['soft_allocation_state', '가예약상태']) === null ? null : String(pick(['soft_allocation_state', '가예약상태'])), forecastDemand: numberValue(['forecast_demand', '예측수요']),
    endingProjectedInventory: numberValue(['ending_projected_inventory', '기말예상재고']), stockoutPeriod: pick(['stockout_period', '소진기간']) === null ? null : String(pick(['stockout_period', '소진기간'])), stockoutDate: pick(['stockout_date', '소진예상일']) === null ? null : String(pick(['stockout_date', '소진예상일'])),
    daysOfSupply: numberValue(['days_of_supply', '공급일수']), monthsOfSupply: numberValue(['months_of_supply', '공급개월수']),
    riskStatus: status === 'SAFE' || status === 'WARNING' || status === 'CRITICAL' || status === 'CALCULATION_UNAVAILABLE' ? status : 'CALCULATION_UNAVAILABLE', reasonCode: pick(['reason_code', 'reason', '사유코드']) === null ? null : String(pick(['reason_code', 'reason', '사유코드'])),
  };
}

export function normalizeLeadtimePolicy(row: Record<string, unknown>): LeadtimePolicy {
  const pick = (keys: string[]) => keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== '') ?? null;
  const numberValue = (keys: string[]) => { const raw = pick(keys); if (raw === null) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; };
  const textValue = (keys: string[]) => { const raw = pick(keys); return raw === null ? null : String(raw); };
  return {
    itemId: textValue(['item_id', '품목코드']), supplierId: String(pick(['supplier_id', '공급처코드']) ?? '미정'), supplier: String(pick(['supplier_name', 'supplier', '공급처', '공급업체명']) ?? '미정'),
    actualLeadTime: numberValue(['mean_days', 'actual_lead_time', '실적리드타임']), p50: numberValue(['p50_days', 'p50', 'P50']), p80: numberValue(['p80_days', 'p80', 'P80']), p90: numberValue(['p90_days', 'p90', 'P90']),
    adminLeadTime: numberValue(['planned_lead_time', 'admin_lead_time', '관리자확정리드타임']), effectiveLeadTime: numberValue(['effective_lead_time', '적용리드타임']), effectiveFrom: textValue(['effective_from', '적용일']), changedBy: textValue(['changed_by', 'updated_by', '변경자']), source: textValue(['source', '적용근거']),
  };
}

export function normalizeSafetyStock(row: Record<string, unknown>): SafetyStock {
  const pick = (keys: string[]) => keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== '') ?? null;
  const numberValue = (keys: string[]) => { const raw = pick(keys); if (raw === null) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; };
  return {
    itemId: String(pick(['item_id', '품목코드']) ?? '미정'), itemGrade: pick(['item_grade', '등급']) === null ? null : String(pick(['item_grade', '등급'])),
    leadtimeDays: numberValue(['leadtime_days', 'effective_leadtime', '리드타임']), demandDaily: numberValue(['demand_daily', 'expected_daily_demand', '일수요']), forecastErrorSigma: numberValue(['forecast_error_sigma', 'sigma_d', '예측오차시그마']), leadtimeSigma: numberValue(['leadtime_sigma', 'sigma_l', '리드타임표준편차']),
    serviceLevel: numberValue(['service_level', '서비스레벨']), zValue: numberValue(['z_value', 'z', 'Z']), sigmaDlt: numberValue(['sigma_dlt', 'sigma_DLT']), safetyStock: numberValue(['safety_stock', '안전재고']),
    calculationStatus: String(pick(['calculation_status', '상태']) ?? 'CALCULATION_UNAVAILABLE'), reasonCode: pick(['reason_code', 'reason', '사유코드']) === null ? null : String(pick(['reason_code', 'reason', '사유코드'])),
  };
}

export function normalizePurchaseRecommendation(row: Record<string, unknown>): PurchaseRecommendation {
  const pick = (keys: string[]) => keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== '') ?? null;
  const numberValue = (keys: string[]) => { const raw = pick(keys); if (raw === null) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; };
  const booleanValue = (keys: string[]) => { const raw = pick(keys); if (raw === null) return null; if (raw === true || raw === false) return raw; return String(raw).toLowerCase() === 'true'; };
  const status = String(pick(['risk_status', 'status', '위험도']) ?? 'CALCULATION_UNAVAILABLE').toUpperCase();
  const trace = pick(['calculation_trace', '계산근거']);
  return {
    itemId: String(pick(['item_id', '품목코드']) ?? '미정'), itemName: String(pick(['item_name', '품목명']) ?? '미정'), itemGrade: pick(['item_grade', '등급']) === null ? null : String(pick(['item_grade', '등급'])),
    forecastQty: numberValue(['forecast_qty', 'forecast_demand', '예측수요']), confirmedOrderQty: numberValue(['confirmed_order_qty', 'confirmed_sales_order', '확정수주']), demandBasisQty: numberValue(['demand_basis_qty', 'demand_basis', '기준수요']), availableInventory: numberValue(['available_inventory', 'current_stock', '현재고']), scheduledReceipt: numberValue(['scheduled_receipt', 'open_po', '입고예정']), safetyStock: numberValue(['safety_stock', '안전재고']), effectiveLeadtime: numberValue(['effective_leadtime', 'planned_lead_time', '리드타임']), stockoutDate: pick(['stockout_date', '소진예상일']) === null ? null : String(pick(['stockout_date', '소진예상일'])), safetyBufferDays: numberValue(['safety_buffer_days', '안전버퍼일']), requiredQty: numberValue(['required_qty', '필요수량']), moq: numberValue(['moq', 'MOQ']), packSize: numberValue(['pack_size', 'Pack Size']), recommendedQty: numberValue(['recommended_qty', '추천수량']), recommendedOrderDate: pick(['recommended_order_date', '발주권고일']) === null ? null : String(pick(['recommended_order_date', '발주권고일'])),
    riskStatus: status === 'SAFE' || status === 'WARNING' || status === 'CRITICAL' || status === 'CALCULATION_UNAVAILABLE' ? status : 'CALCULATION_UNAVAILABLE', calculationStatus: String(pick(['calculation_status', '상태']) ?? 'CALCULATION_UNAVAILABLE'), reasonCode: pick(['reason_code', 'reason', '사유코드']) === null ? null : String(pick(['reason_code', 'reason', '사유코드'])), forecastRunId: pick(['forecast_run_id', 'run_id']) === null ? null : String(pick(['forecast_run_id', 'run_id'])), modelVersion: pick(['model_version', '모델버전']) === null ? null : String(pick(['model_version', '모델버전'])), isImmediate: booleanValue(['is_immediate', 'immediate']), isOverdue: booleanValue(['is_overdue', 'overdue']), orderTimingStatus: pick(['order_timing_status', '발주상태']) === null ? null : String(pick(['order_timing_status', '발주상태'])), calculationTrace: trace !== null && typeof trace === 'object' ? trace as Record<string, unknown> : null,
  };
}
