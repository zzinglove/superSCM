import { setManualChampion } from '@/app/(admin)/admin/backtest-actions';
import type { PerformanceRow } from '@/lib/backtest-model';
export default function ManualChampionForm({ itemId, rows }: { itemId: string; rows: PerformanceRow[] }) {
  const candidates = rows.filter((row) => row.itemId === itemId && row.calculationStatus === 'SUCCESS' && row.modelId);
  if (!candidates.length) return null;
  return <form action={setManualChampion} className="manual-champion-form"><input type="hidden" name="item_id" value={itemId}/><select name="model_id" defaultValue={candidates[0].modelId??''} aria-label={`${itemId} 수동 Champion 모델`}>{candidates.map((row)=><option key={row.modelId} value={row.modelId??''}>{row.modelId}</option>)}</select><input name="reason" required placeholder="수동 지정 사유" aria-label={`${itemId} 수동 지정 사유`}/><button className="ui-button" type="submit">수동 지정</button></form>;
}
