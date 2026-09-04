import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import { getLeadtimeHistory, getLeadtimePolicies } from '@/lib/scm';
import type { LeadtimePolicy } from '@/lib/scm-model';
import { saveLeadtimePolicy } from './actions';

export const dynamic = 'force-dynamic';

const value = (number: number | null, suffix = '일') => number === null ? <EmptyValue reason="NO_VALUE" /> : `${number}${suffix}`;
const columns: DataColumn<LeadtimePolicy>[] = [
  { key: 'itemId', label: 'Item', render: () => <span className="muted">공급처 기준</span> },
  { key: 'supplier', label: 'Supplier' },
  { key: 'actualLeadTime', label: '실적 Lead Time', align: 'right', render: (row) => value(row.actualLeadTime) },
  { key: 'p50', label: 'P50', align: 'right', render: (row) => value(row.p50) },
  { key: 'p80', label: 'P80', align: 'right', render: (row) => value(row.p80) },
  { key: 'p90', label: 'P90', align: 'right', render: (row) => value(row.p90) },
  { key: 'adminLeadTime', label: '관리자 확정', align: 'right', render: (row) => value(row.adminLeadTime) },
  { key: 'effectiveLeadTime', label: 'Effective', align: 'right', render: (row) => value(row.effectiveLeadTime) },
  { key: 'effectiveFrom', label: '적용일', render: (row) => row.effectiveFrom ?? <EmptyValue reason="NO_EFFECTIVE_DATE" /> },
  { key: 'changedBy', label: '변경자', render: (row) => row.changedBy ?? <EmptyValue reason="NO_CHANGED_BY" /> },
  { key: 'source', label: '적용 근거', render: (row) => row.source ?? <EmptyValue reason="NO_LEADTIME" /> },
];

export default async function AdminLeadtimePage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const params = await searchParams;
  const [{ rows, error }, history] = await Promise.all([getLeadtimePolicies(), getLeadtimeHistory()]);
  return <><PageHeader eyebrow="ADMIN / SCM POLICIES" title="Lead Time 정책" description="공급처별 실적 분위수와 관리자 확정 Lead Time을 관리합니다." actions={<Badge status="SAFE">ADMIN ONLY</Badge>} />
    {params.error && <Panel><p className="value-critical">{params.error}</p></Panel>}
    {error ? <Panel><p className="value-critical">조회에 실패했습니다.</p><p className="muted">{error}</p></Panel> : rows.length === 0 ? <Panel><p className="muted">표시할 Lead Time 정책이 없습니다.</p></Panel> : <Panel title="Effective Lead Time" meta="관리자 확정값 → 실적 P80"><DataTable columns={columns} rows={rows} empty="표시할 데이터가 없습니다." /></Panel>}
    <div className="grid grid-2 section-gap"><Panel title="정책 변경" meta="관리자 확정값만 변경할 수 있습니다."><form action={saveLeadtimePolicy} className="settings-form"><label>Supplier ID<input name="supplier_id" placeholder="SUP001" required /></label><label>관리자 확정 Lead Time (일)<input name="planned_lead_time" type="number" min="1" step="1" required /></label><label>적용일<input name="effective_from" type="date" required /></label><label>변경 사유<textarea name="confirmed_reason" required /></label><button className="button primary" type="submit">정책 저장</button></form></Panel><Panel title="변경 이력"><DataTable columns={[{ key: 'supplier_id', label: 'Supplier' }, { key: 'changed_at', label: '변경일' }, { key: 'changed_by', label: '변경자' }, { key: 'change_reason', label: '사유' }]} rows={history.rows} empty={history.error ? `조회에 실패했습니다: ${history.error}` : '변경 이력이 없습니다.'} /></Panel></div>
  </>;
}
