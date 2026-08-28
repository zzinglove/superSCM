import type { ReactNode } from 'react';

export default function InsightBanner({ children }: { children: ReactNode }) {
  return <aside className="insight-banner"><span className="insight-mark">i</span><div>{children}</div></aside>;
}
