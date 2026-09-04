import PageHeader from '@/components/shell/page-header';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import { getInventoryProjection, getStockoutKpi } from '@/lib/scm';
import type { InventoryProjection } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

const number = (value: number | null, suffix = '') => value === null ? <EmptyValue reason="CALCULATION_UNAVAILABLE" /> : `${value.toLocaleString()}${suffix}`;
const status = (row: InventoryProjection) => <Badge status={row.riskStatus}>{row.riskStatus}</Badge>;

const columns: DataColumn<InventoryProjection>[] = [
  { key: 'itemId', label: '품목코드' },
  { key: 'period', label: '기간', render: (row) => row.period ?? <EmptyValue reason="NO_PERIOD" /> },
  { key: 'beginningInventory', label: '시작 재고', align: 'right', render: (row) => number(row.beginningInventory, '개') },
  { key: 'scheduledReceipt', label: '입고 예정', align: 'right', render: (row) => number(row.scheduledReceipt, '개') },
  { key: 'confirmedSalesOrder', label: '확정수주', align: 'right', render: (row) => number(row.confirmedSalesOrder, '개') },
  { key: 'softAllocation', label: '가예약', align: 'right', render: (row) => <>{number(row.softAllocation, '개')}<br /><span className="muted">{row.softAllocationState ?? '—'}</span></> },
  { key: 'forecastDemand', label: 'Forecast 수요', align: 'right', render: (row) => number(row.forecastDemand, '개') },
  { key: 'endingProjectedInventory', label: '기말 예상 재고', align: 'right', render: (row) => number(row.endingProjectedInventory, '개') },
  { key: 'stockoutDate', label: '소진일/기간', render: (row) => row.stockoutDate ?? row.stockoutPeriod ?? <EmptyValue reason={row.reasonCode ?? 'NO_STOCKOUT'} /> },
  { key: 'daysOfSupply', label: 'Days of Supply', align: 'right', render: (row) => number(row.daysOfSupply, '일') },
  { key: 'monthsOfSupply', label: 'Months of Supply', align: 'right', render: (row) => number(row.monthsOfSupply, '개월') },
  { key: 'riskStatus', label: 'Risk Status', render: status },
  { key: 'reasonCode', label: 'Reason Code', render: (row) => row.reasonCode ?? '—' },
];

export default async function StockoutPage() {
  const [{ rows, error }, { data: kpi, error: kpiError }] = await Promise.all([getInventoryProjection(), getStockoutKpi()]);
  if (error) return <><PageHeader title="Inventory Projection" description="Forecast 기반 기간별 재고 projection을 조회합니다." /><Panel><p className="value-critical">조회에 실패했습니다.</p><p className="muted">{error}</p></Panel></>;
  if (rows.length === 0) return <><PageHeader title="Inventory Projection" description="Forecast 기반 기간별 재고 projection을 조회합니다." /><Panel><p className="muted">표시할 데이터가 없습니다.</p>{kpiError && <p className="muted">KPI 조회: {kpiError}</p>}</Panel></>;
  return <><PageHeader title="Inventory Projection" description="Champion Forecast, 현재고, Open PO, 확정수주, 가예약을 결합한 기간별 재고 projection입니다." actions={<Badge status="SAFE">SUPABASE LIVE</Badge>} />
    <div className="grid grid-4"><KpiCard label="Projection 행" value={rows.length} foot="기간별 계산 결과" /><KpiCard label="Critical" value={kpi?.n_critical ?? rows.filter((row) => row.riskStatus === 'CRITICAL').length} foot="예상 입고보다 빠른 결품" tone="critical" /><KpiCard label="Warning" value={kpi?.n_warning ?? rows.filter((row) => row.riskStatus === 'WARNING').length} foot="Lead Time 내 결품" tone="warning" /><KpiCard label="계산 불가" value={kpi?.n_calculation_unavailable ?? rows.filter((row) => row.riskStatus === 'CALCULATION_UNAVAILABLE').length} foot="필수 입력 확인 필요" /></div>
    <Panel className="section-gap" title="기간별 Inventory Projection" meta="Beginning + Receipt − Confirmed SO − Soft Allocation − 잔여 Forecast"><DataTable columns={columns} rows={rows} empty="표시할 데이터가 없습니다." /></Panel>
  </>;
}
