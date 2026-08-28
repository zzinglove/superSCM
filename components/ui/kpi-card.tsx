import type { ReactNode } from 'react';

export default function KpiCard({ label, value, foot, tone = 'default' }: { label: string; value: ReactNode; foot?: ReactNode; tone?: 'default' | 'safe' | 'warning' | 'critical' }) {
  return <section className={`panel kpi-card kpi-${tone}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div>{foot && <div className="kpi-foot">{foot}</div>}</section>;
}
