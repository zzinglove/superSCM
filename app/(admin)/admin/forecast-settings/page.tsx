import { requireAdmin } from '@/lib/auth';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';

export default async function ForecastSettingsPage() {
  await requireAdmin();
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();
  const [{ data: coverage }, { data: setting }, { data: policies }, { data: rules }] = await Promise.all([
    supabase.schema('analytics').from('v_data_coverage').select('*').maybeSingle(),
    supabase.schema('core').from('forecast_setting').select('*').maybeSingle(),
    supabase.schema('core').from('policy_config').select('config_key,service_level,review_period_days,safety_buffer_days,active'),
    supabase.schema('core').from('outlier_rule').select('rule_id,rule_name,active'),
  ]);
  return <div><PageHeader eyebrow="ADMIN / FORECAST" title="Forecast 설정" description="학습·검증 기간과 운영 정책의 적용 상태를 확인합니다." /><div className="grid grid-2"><Panel title="데이터 격리 상태"><div className="settings-row"><span>전체 데이터 기간</span><strong>{coverage?.data_start ?? <EmptyValue reason="NO_DATA" />} ~ {coverage?.data_end ?? <EmptyValue reason="NO_DATA" />}</strong></div><div className="settings-row"><span>학습 기간</span><strong>{setting?.train_start ?? <EmptyValue reason="TRAIN_START_UNSET" />} ~ {setting?.train_end ?? <EmptyValue reason="TRAIN_END_UNSET" />}</strong></div><div className="settings-row"><span>검증 기간</span><strong>{setting?.test_start ?? <EmptyValue reason="TEST_START_UNSET" />} ~ {setting?.test_end ?? <EmptyValue reason="TEST_END_UNSET" />}</strong></div><div className="settings-row"><span>Granularity</span><strong>{setting?.granularity ?? <EmptyValue reason="GRANULARITY_UNSET" />}</strong></div><div className="settings-row"><span>학습 격리</span><Badge status={coverage?.train_window_ok ? 'SAFE' : 'CRITICAL'}>{coverage?.train_window_ok ? '정상' : '확인 필요'}</Badge></div><div className="settings-row"><span>검증 격리</span><Badge status={coverage?.test_window_ok ? 'SAFE' : 'CRITICAL'}>{coverage?.test_window_ok ? '정상' : '확인 필요'}</Badge></div><div className="settings-row"><span>행 수</span><strong>{coverage ? <>학습 {coverage.train_row_count} / 검증 {coverage.test_row_count}</> : <EmptyValue reason="COVERAGE_UNAVAILABLE" />}</strong></div></Panel><Panel title="운영 정책"><div className="settings-row"><span>정책 설정</span><strong>{policies?.length ?? 0}건</strong></div>{policies?.map((policy) => <div className="settings-row" key={policy.config_key}><span>{policy.config_key}</span><span>서비스 {policy.service_level ?? '—'} · 검토 {policy.review_period_days ?? '—'}일 · 버퍼 {policy.safety_buffer_days ?? '—'}일</span></div>)}<div className="settings-row"><span>이상치 규칙</span><strong>{rules?.filter((rule) => rule.active).length ?? 0}건 활성</strong></div></Panel></div></div>;
}
