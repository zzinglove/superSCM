'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function saveSafetyStockPolicy(formData: FormData) {
  const { authUser } = await requireAdmin();
  const itemGrade = String(formData.get('item_grade') ?? '').trim().toUpperCase();
  const serviceLevel = Number(formData.get('service_level'));
  const zValue = Number(formData.get('z_value'));
  if (!itemGrade || !Number.isFinite(serviceLevel) || serviceLevel <= 0 || serviceLevel >= 1 || !Number.isFinite(zValue) || zValue <= 0) {
    redirect('/admin/safety-stock?error=등급·서비스 레벨·Z 값을 확인하세요.');
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').from('safety_stock_policy').upsert({ item_grade: itemGrade, service_level: serviceLevel, z_value: zValue, updated_by: authUser.id, active: true }, { onConflict: 'item_grade' });
  if (error) redirect(`/admin/safety-stock?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/safety-stock');
  revalidatePath('/analysis/purchase-recommendation');
  redirect('/admin/safety-stock?updated=1');
}
