'use client';
import { useFormStatus } from 'react-dom';
import { runBaselineForecast } from '../forecast-actions';
function SubmitButton() { const { pending } = useFormStatus(); return <button className="ui-button ui-button-primary" type="submit" disabled={pending}>{pending ? '실행 중…' : 'Baseline 실행'}</button>; }
export default function RunActions() { return <form action={runBaselineForecast}><SubmitButton /></form>; }
