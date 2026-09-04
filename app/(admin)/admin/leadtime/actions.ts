'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function saveLeadtimePolicy(formData: FormData) {
  const { authUser } = await requireAdmin();
  const supplierId = String(formData.get('supplier_id') ?? '').trim();
  const rawLeadTime = String(formData.get('planned_lead_time') ?? '').trim();
  const effectiveFrom = String(formData.get('effective_from') ?? '').trim();
  const reason = String(formData.get('confirmed_reason') ?? '').trim();
  const plannedLeadTime = Number(rawLeadTime);
  if (!supplierId || !Number.isInteger(plannedLeadTime) || plannedLeadTime <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || !reason) {
    redirect('/admin/leadtime?error=입력값을 확인하세요.');
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').from('leadtime_plan').upsert({
    supplier_id: supplierId,
    planned_lead_time: plannedLeadTime,
    basis: 'ADMIN_CONFIRMED',
    confirmed_reason: reason,
    confirmed_at: new Date().toISOString(),
    effective_from: effectiveFrom,
    updated_by: authUser.id,
  }, { onConflict: 'supplier_id' });
  if (error) redirect(`/admin/leadtime?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/leadtime');
  revalidatePath('/analysis/stockout');
  redirect('/admin/leadtime?updated=1');
}
