'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMenuItems, type MenuRole } from '@/lib/menu';

export default function Sidebar({ role = 'USER' }: { role?: MenuRole }) {
  const pathname = usePathname();
  const items = getMenuItems(role);
  const sections = Array.from(new Set(items.map((item) => item.section)));
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">OP</div><div className="brand-copy"><strong>월간 발주계획</strong><span>SCM PREDICT · V2.4</span></div></div>
    {sections.map((section) => <div key={section}><div className="nav-label">{section}</div><nav className="nav-list" aria-label={section}>{items.filter((item) => item.section === section).map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} className={`nav-button ${active ? 'active' : ''}`}><span className="nav-number"><Icon size={14} /></span><span>{item.label}</span></Link>; })}</nav></div>)}
    <div className="sidebar-foot"><b>{role === 'ADMIN' ? '관리자 모드' : '사용자 모드'}</b><br />데이터 기반 발주계획 관리<br />접속 환경 · Production</div>
  </aside>;
}
