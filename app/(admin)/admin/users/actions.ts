'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function updateUser(formData: FormData) {
  const { authUser } = await requireAdmin();
  const targetId = String(formData.get('user_id') ?? '');
  const role = String(formData.get('role') ?? 'USER');
  const active = String(formData.get('active') ?? 'false') === 'true';
  if (!targetId || !['ADMIN', 'USER'].includes(role)) redirect('/admin/users?error=invalid');
  if (targetId === authUser.id) redirect('/admin/users?error=self');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').from('app_user').update({ role, active }).eq('user_id', targetId);
  if (error) redirect(`/admin/users?error=${encodeURIComponent('변경에 실패했습니다.')}`);
  revalidatePath('/admin/users');
  redirect('/admin/users?updated=1');
}
