'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(String(formData.get('next') ?? '/user/dashboard'));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent('이메일 또는 비밀번호를 확인해주세요.')}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

function safeNext(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/user/dashboard';
}
