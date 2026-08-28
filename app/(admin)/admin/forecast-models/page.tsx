import { requireAdmin } from '@/lib/auth';
import { getForecastModels } from '@/lib/forecast';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import ModelToggle from './model-toggle';
export default async function ForecastModelsPage() {
  await requireAdmin(); const { rows, error } = await getForecastModels();
  return <div><PageHeader eyebrow="ADMIN / FORECAST" title="Forecast 모델" description="모델 정의와 적용 수요 유형을 확인하고 활성 모델을 관리합니다." /><Panel title="등록 모델" meta={error ? '조회 오류' : `${rows.length}개`}>
    {error ? <p className="text-danger">모델을 불러오지 못했습니다: {error}</p> : rows.length === 0 ? <p className="muted">등록된 모델이 없습니다.</p> : <div className="data-table-scroll"><table className="ui-data-table"><thead><tr><th>모델</th><th>Family / Engine</th><th>버전</th><th>적용 수요 유형</th><th>Parameters</th><th>상태</th><th>변경</th></tr></thead><tbody>{rows.map((model) => <tr key={model.modelId}><td><strong>{model.modelName}</strong><br /><span className="muted">{model.modelId}</span></td><td>{model.family} / {model.engine}</td><td>{model.version}</td><td>{model.applicableDemandType.length ? model.applicableDemandType.join(', ') : <EmptyValue reason="NO_APPLICABLE_TYPE" />}</td><td><code>{model.parameters ? JSON.stringify(model.parameters) : '—'}</code></td><td><Badge status={model.enabled ? 'SAFE' : 'WARNING'}>{model.enabled ? '활성' : '비활성'}</Badge></td><td><ModelToggle modelId={model.modelId} enabled={model.enabled} /></td></tr>)}</tbody></table></div>}
  </Panel></div>;
}
