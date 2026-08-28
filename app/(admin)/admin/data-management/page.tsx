import { requireAdmin } from '@/lib/auth';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import ImportWizard from './import-wizard';
export default async function DataManagementPage() {
  await requireAdmin();
  return <><PageHeader eyebrow="ADMIN / DATA" title="데이터 적재" description="CSV와 Excel을 검증한 뒤 승인된 데이터만 RAW에 저장합니다." /><ImportWizard /><Panel title="적재 이력"><p className="muted">파일을 적재하면 이곳에서 batch 상태와 rollback을 확인할 수 있습니다.</p></Panel></>;
}
