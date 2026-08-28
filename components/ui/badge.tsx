import type { ReactNode } from 'react';

export type Status = 'SAFE' | 'WARNING' | 'CRITICAL' | 'CALCULATION_UNAVAILABLE';
const statusLabels: Record<Status, string> = { SAFE: '안전', WARNING: '주의', CRITICAL: '위험', CALCULATION_UNAVAILABLE: '계산 불가' };
export default function Badge({ status, children }: { status: Status; children?: ReactNode }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{children ?? statusLabels[status]}</span>;
}
