import Link from 'next/link';
import PageHeader from '@/components/shell/page-header';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import InsightBanner from '@/components/ui/insight-banner';

export default function UserDashboardPage() {
  return <><PageHeader eyebrow="PLANNING RUN / 2026.09" title="월간 발주계획 현황" description="수요 확정부터 분석까지 이번 달 업무 진행상태를 확인합니다." actions={<Link className="ui-button ui-button-primary" href="/user/workflow">발주계획 시작</Link>} />
    <div className="grid grid-4"><KpiCard label="당월 총 발주금액" value="₩107.2M" foot="전월 대비 +8.4%" tone="safe" /><KpiCard label="수요 확정 상태" value="진행 중" foot="회의 확정 대기" /><KpiCard label="발주량 예외" value="2건" foot="Flex 1 · MOQ 1" tone="warning" /><KpiCard label="분석 상태" value="LIVE" foot="Supabase 연결" tone="safe" /></div>
    <div className="grid grid-2 section-gap"><Panel title="분석 바로가기" meta="공통 분석 메뉴"><div className="quick-links"><Link href="/user/analysis/leadtime">리드타임 격차 <span>공급처별 실제 납기 비교 →</span></Link><Link href="/user/analysis/stockout">재고 소진 위험 <span>품목별 소진 예상일 확인 →</span></Link></div></Panel><Panel title="이번 달 안내"><InsightBanner>분석 화면은 Supabase의 analytics 뷰를 기준으로 최신 결과를 표시합니다.</InsightBanner></Panel></div>
  </>;
}
