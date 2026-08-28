import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
export default function AdminAuditPage() { return <><PageHeader eyebrow="ADMIN" title="감사 로그" description="데이터 변경과 확정 이력을 확인합니다." /><Panel title="감사 로그"><p className="empty-state">아직 연결된 감사 로그가 없습니다.</p></Panel></>; }
