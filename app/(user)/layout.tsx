import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';

export default function UserLayout({ children }: { children: ReactNode }) {
  return <div className="app-shell"><Sidebar role="USER" /><div className="main"><Topbar /><main className="content">{children}</main></div></div>;
}
