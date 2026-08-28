import { forbidden, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AppRole = 'ADMIN' | 'USER';
export type AppUser = { user_id: string; email: string; name: string; department: string | null; role: AppRole; active: boolean; last_login_at: string | null };

export async function getRole(): Promise<AppUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.schema('core').from('app_user').select('user_id,email,name,department,role,active,last_login_at').eq('user_id', user.id).maybeSingle();
  return (data as AppUser | null) ?? null;
}

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const appUser = await getRole();
  if (!appUser || !appUser.active) redirect('/login?error=inactive');
  return { authUser: user, appUser };
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.appUser.role !== 'ADMIN') forbidden();
  return session;
}
