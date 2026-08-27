import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import { getStockoutKpi, getStockoutRisk } from '@/lib/scm';
import type { StockoutRisk } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

function RiskBadge({ status }: { status: StockoutRisk['riskStatus'] }) {
  if (status === 'CRITICAL') return <span className="tag red">위험</span>;
  if (status === 'SAFE') return <span className="tag green">안전</span>;
  return <span className="tag gray">판정 불가</span>;
}

function Reason({ reason }: { reason: StockoutRisk['reason'] }) {
  if (reason === 'NO_USAGE') return <span className="muted">사용 이력 없음</span>;
  if (reason === 'NO_LEADTIME') return <span className="muted">리드타임 없음</span>;
  return <span className="muted">—</span>;
}

const columns: Column<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' },
  { key: 'itemName', label: '품목명' },
  { key: 'supplier', label: '공급처' },
  { key: 'availableQty', label: '가용재고', align: 'right', render: (row) => formatNumber(row.availableQty, '개') },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (row) => formatNumber(row.dailyUsageAvg, '개') },
  { key: 'plannedLeadTime', label: '계획 리드타임', align: 'right', render: (row) => formatNumber(row.plannedLeadTime, '일') },
  { key: 'stockoutDays', label: '소진 예상', align: 'right', render: (row) => formatNumber(row.stockoutDays, '일') },
  { key: 'stockoutDate', label: '예상 소진일', render: (row) => row.stockoutDate ?? '—' },
  { key: 'riskStatus', label: '위험도', render: (row) => <RiskBadge status={row.riskStatus} /> },
  { key: 'reason', label: '사유', render: (row) => <Reason reason={row.reason} /> },
];

export default async function StockoutPage() {
  const [{ rows, error }, { data: kpi }] = await Promise.all([getStockoutRisk(), getStockoutKpi()]);

  if (error) {
    return <AnalysisFrame title="재고 소진 위험" description="가용재고와 일평균 사용량을 기준으로 품목별 소진 위험을 분석합니다.">
      <div className="card"><p className="text-danger">조회에 실패했습니다.</p><p className="muted">{error}</p></div>
    </AnalysisFrame>;
  }

  const criticalCount = kpi?.n_critical ?? rows.filter((row) => row.riskStatus === 'CRITICAL').length;
  const unknownCount = kpi?.n_unknown ?? rows.filter((row) => row.riskStatus === 'UNKNOWN').length;
  const within30Count = kpi?.n_within_30d ?? rows.filter((row) => row.stockoutDays !== null && row.stockoutDays <= 30).length;

  return <AnalysisFrame title="재고 소진 위험" description="가용재고와 일평균 사용량을 기준으로 품목별 소진 위험을 분석합니다.">
    <div className="grid grid-4">
      <div className="card metric"><div className="metric-label">분석 품목</div><div className="metric-value">{kpi?.n_items ?? rows.length}</div><div className="metric-foot">재고 소진 분석 대상</div></div>
      <div className="card metric"><div className="metric-label">소진 위험</div><div className="metric-value">{criticalCount}</div><div className="metric-foot warn">계획 리드타임 내 소진</div></div>
      <div className="card metric"><div className="metric-label">30일 이내 소진</div><div className="metric-value">{within30Count}</div><div className="metric-foot warn">가용재고 기준</div></div>
      <div className="card metric"><div className="metric-label">판정 불가</div><div className="metric-value">{unknownCount}</div><div className="metric-foot">사용량·리드타임 확인 필요</div></div>
    </div>
    <div className="section card"><div className="card-title"><h3>품목별 재고 소진 위험</h3><span>가용재고 ÷ 일평균 사용량</span></div>
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.itemId} empty="데이터가 없습니다. Exposed schemas 와 analytics.v_stockout_risk 를 확인하세요." />
    </div>
  </AnalysisFrame>;
}
