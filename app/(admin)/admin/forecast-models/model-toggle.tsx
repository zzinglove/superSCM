'use client';
import { useFormStatus } from 'react-dom';
import { updateForecastModel } from '../forecast-actions';
function SubmitButton({ enabled }: { enabled: boolean }) { const { pending } = useFormStatus(); return <button className="ui-button" type="submit" disabled={pending}>{pending ? '저장 중…' : enabled ? '비활성화' : '활성화'}</button>; }
export default function ModelToggle({ modelId, enabled }: { modelId: string; enabled: boolean }) { return <form action={updateForecastModel}><input type="hidden" name="model_id" value={modelId} /><input type="hidden" name="enabled" value={String(!enabled)} /><SubmitButton enabled={enabled} /></form>; }
 
