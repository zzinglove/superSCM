import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { saveSafetyStockPolicy } from './actions';

export const dynamic = 'force-dynamic';
type Policy = Record<string, unknown>;
const columns: DataColumn<Policy>[] = [
  { key: 'item_grade', label: 'Item Grade' },
  { key: 'service_level', label: 'Service Level', render: (row) => row.service_level === null || row.service_level === undefined ? <EmptyValue reason="NO_SERVICE_LEVEL" /> : String(row.service_level) },
  { key: 'z_value', label: 'Z Value', render: (row) => row.z_value === null || row.z_value === undefined ? <EmptyValue reason="NO_Z_VALUE" /> : String(row.z_value) },
  { key: 'active', label: '상태', render: (row) => <Badge status={row.active === true ? 'SAFE' : 'CALCULATION_UNAVAILABLE'}>{row.active === true ? '활성' : '비활성'}</Badge> },
  { key: 'updated_at', label: '변경일' },
];

export default async function AdminSafetyStockPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core').from('safety_stock_policy').select('*').order('item_grade');
  const rows = (data ?? []) as Policy[];
  return <><PageHeader eyebrow="ADMIN / SCM POLICIES" title="Safety Stock 정책" description="Item Grade별 Service Level과 Z Value를 관리합니다." actions={<Badge status="SAFE">ADMIN ONLY</Badge>} />{params.error && <Panel><p className="value-critical">{params.error}</p></Panel>}{error ? <Panel><p className="value-critical">조회에 실패했습니다.</p><p className="muted">{error.message}</p></Panel> : rows.length === 0 ? <Panel><p className="muted">등록된 Safety Stock 정책이 없습니다.</p></Panel> : <Panel title="등급별 정책"><DataTable columns={columns} rows={rows} empty="표시할 정책이 없습니다." /></Panel>}<Panel className="section-gap" title="정책 추가·변경" meta="변경은 ADMIN만 가능합니다."><form action={saveSafetyStockPolicy} className="settings-form"><label>Item Grade<input name="item_grade" placeholder="A" required /></label><label>Service Level<input name="service_level" type="number" min="0.01" max="0.99" step="0.001" required /></label><label>Z Value<input name="z_value" type="number" min="0.01" step="0.001" required /></label><button className="button primary" type="submit">정책 저장</button></form></Panel></>;
}
