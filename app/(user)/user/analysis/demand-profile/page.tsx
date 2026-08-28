import PageHeader from '@/components/shell/page-header';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import DemandProfileTable from './demand-profile-table';
import { getDemandProfileKpi, getDemandProfiles } from '@/lib/demand-profile';
export const dynamic='force-dynamic';
function kpiValue(value:unknown,reason:string){return typeof value==='number'?value:<EmptyValue reason={reason}/>;}
export default async function DemandProfilePage(){
  const [{rows,error},{data:kpi,error:kpiError}]=await Promise.all([getDemandProfiles(),getDemandProfileKpi()]);
  if(error||kpiError)return <><PageHeader title="SKU 수요 프로파일" description="학습기간의 월별 수요 특성을 분석합니다."/><Panel><Badge status="CRITICAL">조회 실패</Badge><p className="muted">{error??kpiError}</p></Panel></>;
  return <><PageHeader title="SKU 수요 프로파일" description="학습기간 데이터만 사용해 SKU별 수요 패턴과 Forecast 후보를 확인합니다." actions={<Badge status="SAFE">TRAIN DATA ONLY</Badge>}/><div className="grid grid-4"><KpiCard label="전체 SKU" value={kpiValue(kpi?.total_items,'KPI_UNAVAILABLE')} foot="학습기간 분석 대상"/><KpiCard label="SMOOTH" value={kpiValue(kpi?.n_smooth,'KPI_UNAVAILABLE')} foot="일반 예측 후보"/><KpiCard label="INTERMITTENT" value={kpiValue(kpi?.n_intermittent,'KPI_UNAVAILABLE')} foot="Croston 후보" tone="warning"/><KpiCard label="ERRATIC" value={kpiValue(kpi?.n_erratic,'KPI_UNAVAILABLE')} foot="변동성 높음" tone="warning"/><KpiCard label="LUMPY" value={kpiValue(kpi?.n_lumpy,'KPI_UNAVAILABLE')} foot="Croston 후보" tone="critical"/><KpiCard label="Croston 필요" value={kpiValue(kpi?.n_croston_needed,'KPI_UNAVAILABLE')} foot="INTERMITTENT + LUMPY"/><KpiCard label="계산 불가" value={kpiValue(kpi?.n_calculation_unavailable,'KPI_UNAVAILABLE')} foot="reason_code 확인" tone="critical"/></div><Panel className="section-gap" title="SKU별 Demand Profile" meta="학습기간 저장 결과"><DemandProfileTable rows={rows}/></Panel></>;
}
