import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import { getRole } from '@/lib/auth';

export default async function UserLayout({ children }: { children: ReactNode }) {
  const appUser = await getRole();
  return <div className="app-shell"><Sidebar role={appUser?.role ?? 'USER'} /><div className="main"><Topbar /><main className="content">{children}</main></div></div>;
}
