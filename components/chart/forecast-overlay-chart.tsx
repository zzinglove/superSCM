'use client';
import type { ComparisonSeries } from '@/lib/backtest-model';
export default function ForecastOverlayChart({ series, modelIds }: { series: ComparisonSeries[]; modelIds: string[] }) {
  if (!series.length) return <div className="empty-state">비교할 저장 결과가 없습니다.</div>;
  const values = series.flatMap((row) => [row.actual ?? 0, ...modelIds.map((id) => row.forecasts[id] ?? 0)]); const max = Math.max(...values, 1); const width = 760; const height = 260; const pad = 24;
  const x = (index: number) => pad + (index * (width - pad * 2)) / Math.max(series.length - 1, 1); const y = (value: number) => height - pad - (value / max) * (height - pad * 2);
  const line = (key: (row: typeof series[number]) => number | null) => series.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(key(row) ?? 0)}`).join(' ');
  return <div className="chart-panel"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Actual과 모델별 Forecast 비교 차트" className="forecast-chart"><path d={line((row) => row.actual)} fill="none" stroke="var(--color-ink)" strokeWidth="3" />{modelIds.map((modelId, index) => <path key={modelId} d={line((row) => row.forecasts[modelId] ?? null)} fill="none" stroke={`var(--chart-accent-${(index % 4) + 1})`} strokeWidth="2" strokeDasharray="6 4" />)}</svg><div className="chart-legend"><span><i className="legend-swatch actual" />Actual</span>{modelIds.map((modelId,index)=><span key={modelId}><i className={`legend-swatch accent-${(index%4)+1}`} />{modelId}</span>)}</div></div>;
}
