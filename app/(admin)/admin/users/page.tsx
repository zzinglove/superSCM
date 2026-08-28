import { requireAdmin } from '@/lib/auth';
import Badge from '@/components/ui/badge';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import { updateUser } from './actions';

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();
  const { data: users, error } = await supabase.schema('core').from('app_user').select('user_id,email,name,department,role,active,last_login_at').order('created_at', { ascending: true });
  return <div><PageHeader eyebrow="ADMIN / USERS" title="사용자 관리" description="사용자 권한과 계정 활성 상태를 관리합니다." /><Panel title="등록 사용자" meta={`${users?.length ?? 0}명`}><div className="data-table-scroll"><table className="ui-data-table"><thead><tr><th>사용자</th><th>부서</th><th>권한</th><th>상태</th><th>변경</th></tr></thead><tbody>{error ? <tr><td colSpan={5}>사용자 목록을 불러오지 못했습니다.</td></tr> : users?.map((user) => <tr key={user.user_id}><td><strong>{user.name || user.email}</strong><br /><span className="muted">{user.email}</span></td><td>{user.department ?? '—'}</td><td><Badge status={user.role === 'ADMIN' ? 'CRITICAL' : 'SAFE'}>{user.role}</Badge></td><td><Badge status={user.active ? 'SAFE' : 'WARNING'}>{user.active ? '활성' : '비활성'}</Badge></td><td><form action={updateUser} className="user-admin-form"><input type="hidden" name="user_id" value={user.user_id} /><select name="role" defaultValue={user.role} aria-label={`${user.email} 권한`}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select><select name="active" defaultValue={String(user.active)} aria-label={`${user.email} 상태`}><option value="true">활성</option><option value="false">비활성</option></select><button className="ui-button" type="submit">저장</button></form></td></tr>)}</tbody></table></div>{params.error === 'self' && <p className="text-danger" role="alert">자신의 관리자 권한과 활성 상태는 변경할 수 없습니다.</p>}{params.updated && <p className="text-good" role="status">변경사항을 저장했습니다.</p>}</Panel></div>;
}
