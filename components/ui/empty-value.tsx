import Badge from './badge';

export default function EmptyValue({ reason }: { reason?: string }) {
  return <span className="empty-value"><span>—</span>{reason && <><span className="empty-reason">+ {reason}</span><Badge status={'CALCULATION_UNAVAILABLE'} /></>}</span>;
}
