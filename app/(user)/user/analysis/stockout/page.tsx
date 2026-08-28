import PageHeader from '@/components/shell/page-header';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import { getStockoutKpi, getStockoutRisk } from '@/lib/scm';
import type { StockoutRisk } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

function statusOf(row: StockoutRisk) { if (row.riskStatus === 'CRITICAL') return <Badge status="CRITICAL" />; if (row.riskStatus === 'SAFE') return <Badge status="SAFE" />; return <Badge status="CALCULATION_UNAVAILABLE" />; }
function missing(row: StockoutRisk, key: 'usage' | 'leadtime') { return <EmptyValue reason={key === 'usage' ? 'NO_USAGE' : 'NO_LEADTIME'} />; }
const columns: DataColumn<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' }, { key: 'itemName', label: '품목명' }, { key: 'supplier', label: '공급처' },
  { key: 'availableQty', label: '가용재고', align: 'right', render: (row) => row.availableQty === null ? <EmptyValue reason="NO_STOCK" /> : `${row.availableQty}개` },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (row) => row.dailyUsageAvg === null ? missing(row, 'usage') : `${row.dailyUsageAvg.toFixed(1)}개` },
  { key: 'plannedLeadTime', label: '계획 리드타임', align: 'right', render: (row) => row.plannedLeadTime === null ? missing(row, 'leadtime') : `${row.plannedLeadTime}일` },
  { key: 'stockoutDays', label: '소진 예상', align: 'right', render: (row) => row.stockoutDays === null ? <EmptyValue reason={row.reason ?? 'CALCULATION_UNAVAILABLE'} /> : `${row.stockoutDays.toFixed(1)}일` },
  { key: 'stockoutDate', label: '예상 소진일', render: (row) => row.stockoutDate ?? <EmptyValue reason={row.reason ?? 'CALCULATION_UNAVAILABLE'} /> },
  { key: 'riskStatus', label: '위험도', render: statusOf },
];

export default async function StockoutPage() {
  const [{ rows, error }, { data: kpi }] = await Promise.all([getStockoutRisk(), getStockoutKpi()]);
  if (error) return <><PageHeader title="재고 소진 위험" description="가용재고와 일평균 사용량을 기준으로 품목별 소진 위험을 분석합니다." /><Panel><p className="value-critical">조회에 실패했습니다.</p><p className="muted">{error}</p></Panel></>;
  const nCritical = kpi?.n_critical ?? rows.filter((row) => row.riskStatus === 'CRITICAL').length;
  const nUnknown = kpi?.n_unknown ?? rows.filter((row) => row.riskStatus === 'UNKNOWN').length;
  const nWithin30 = kpi?.n_within_30d ?? rows.filter((row) => row.stockoutDays !== null && row.stockoutDays <= 30).length;
  return <><PageHeader title="재고 소진 위험" description="가용재고와 일평균 사용량을 기준으로 품목별 소진 위험을 분석합니다." actions={<Badge status="SAFE">SUPABASE LIVE</Badge>} />
    <div className="grid grid-4"><KpiCard label="분석 품목" value={kpi?.n_items ?? rows.length} foot="재고 소진 분석 대상" /><KpiCard label="소진 위험" value={nCritical} foot="계획 리드타임 내 소진" tone="critical" /><KpiCard label="30일 이내 소진" value={nWithin30} foot="가용재고 기준" tone="warning" /><KpiCard label="판정 불가" value={nUnknown} foot="사용량·리드타임 확인 필요" /></div>
    <Panel className="section-gap" title="품목별 재고 소진 위험" meta="가용재고 ÷ 일평균 사용량"><DataTable columns={columns} rows={rows} empty="분석 데이터가 없습니다." /></Panel>
  </>;
}
