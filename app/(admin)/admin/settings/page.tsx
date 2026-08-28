import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
export default function AdminSettingsPage() { return <><PageHeader eyebrow="ADMIN" title="관리자 설정" description="SCM 시스템의 기준과 연결 상태를 관리합니다." /><Panel title="환경 상태"><div className="settings-row"><span>Supabase 연결</span><Badge status="SAFE">설정됨</Badge></div><div className="settings-row"><span>분석 스키마</span><Badge status="WARNING">확인 필요</Badge></div></Panel></>; }
