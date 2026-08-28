import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="app-shell"><Sidebar role="ADMIN" /><div className="main"><Topbar title="SCM 관리자" /><main className="content">{children}</main></div></div>;
}
