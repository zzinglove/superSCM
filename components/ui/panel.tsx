import type { ReactNode } from 'react';

export default function Panel({ title, meta, children, className = '' }: { title?: string; meta?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`} >{title && <div className="panel-header"><h3>{title}</h3>{meta && <span>{meta}</span>}</div>}{children}</section>;
}
