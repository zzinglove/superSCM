import PageHeader from '@/components/shell/page-header';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import { getLeadtimeGap } from '@/lib/scm';
import type { LeadtimeGap } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

const columns: DataColumn<LeadtimeGap>[] = [
  { key: 'supplier', label: '공급처' },
  { key: 'country', label: '국가' },
  { key: 'masterLeadTime', label: '마스터', align: 'right', render: (row) => row.masterLeadTime === null ? <EmptyValue reason="NO_LEADTIME" /> : `${row.masterLeadTime}일` },
  { key: 'sampleCount', label: '표본수', align: 'right', render: (row) => row.sampleCount.toLocaleString() },
  { key: 'actualAverage', label: '실적평균', align: 'right', render: (row) => row.actualAverage === null ? <EmptyValue reason="NO_ACTUAL" /> : `${row.actualAverage.toFixed(1)}일` },
  { key: 'p80', label: 'P80', align: 'right', render: (row) => row.p80 === null ? <EmptyValue reason="NO_P80" /> : `${row.p80}일` },
  { key: 'gap', label: '격차', align: 'right', render: (row) => row.gap === null ? <EmptyValue reason="NO_GAP" /> : <span className={row.gap > 0 ? 'value-critical' : 'value-safe'}>{row.gap > 0 ? '+' : ''}{row.gap}일</span> },
];

export default async function LeadtimePage() {
  const { rows, error } = await getLeadtimeGap();
  if (error) return <><PageHeader title="리드타임 격차" description="공급처별 마스터 리드타임과 실제 실적을 비교합니다." /><Panel><p className="value-critical">조회에 실패했습니다.</p><p className="muted">{error}</p></Panel></>;
  return <><PageHeader title="리드타임 격차" description="공급처별 마스터 리드타임과 실제 실적 P80을 비교합니다." actions={<Badge status="SAFE">SUPABASE LIVE</Badge>} />
    <div className="grid grid-3"><KpiCard label="공급처" value={rows.length} foot="분석 대상" /><KpiCard label="실제가 더 김" value={rows.filter((row) => row.gap !== null && row.gap > 0).length} foot="격차가 양수인 공급처" tone="critical" /><KpiCard label="표본 부족" value={rows.filter((row) => row.sampleCount < 10).length} foot="표본 10건 미만" tone="warning" /></div>
    <Panel className="section-gap" title="공급처별 리드타임" meta="격차 = P80 − 마스터"><DataTable columns={columns} rows={rows} empty="분석 데이터가 없습니다." /></Panel>
  </>;
}
