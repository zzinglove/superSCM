import type { LucideIcon } from 'lucide-react';
import { BarChart3, Boxes, Gauge, Settings2, ShieldCheck, UserRound, Workflow } from 'lucide-react';

export type MenuRole = 'USER' | 'ADMIN';
export type MenuItem = { href: string; label: string; icon: LucideIcon; roles: MenuRole[]; section: string };

export const menuItems: MenuItem[] = [
  { href: '/user/dashboard', label: '전체 현황', icon: Gauge, roles: ['USER', 'ADMIN'], section: '업무' },
  { href: '/user/analysis/leadtime', label: '리드타임 격차', icon: BarChart3, roles: ['USER', 'ADMIN'], section: '분석' },
  { href: '/user/analysis/stockout', label: '재고 소진 위험', icon: Boxes, roles: ['USER', 'ADMIN'], section: '분석' },
  { href: '/user/analysis/demand-profile', label: '수요 프로파일', icon: BarChart3, roles: ['USER', 'ADMIN'], section: '분석' },
  { href: '/user/workflow', label: '발주계획 플로우', icon: Workflow, roles: ['USER'], section: '업무' },
  { href: '/admin/settings', label: '관리자 설정', icon: Settings2, roles: ['ADMIN'], section: '관리' },
  { href: '/admin/users', label: '사용자 관리', icon: UserRound, roles: ['ADMIN'], section: '관리' },
  { href: '/admin/data-management', label: '데이터 적재', icon: Boxes, roles: ['ADMIN'], section: '관리' },
  { href: '/admin/forecast-settings', label: 'Forecast 설정', icon: Settings2, roles: ['ADMIN'], section: '관리' },
  { href: '/admin/forecast-models', label: 'Forecast 모델', icon: Settings2, roles: ['ADMIN'], section: '관리' },
  { href: '/admin/forecast-runs', label: 'Forecast 실행 이력', icon: BarChart3, roles: ['ADMIN'], section: '관리' },
  { href: '/admin/audit', label: '감사 로그', icon: ShieldCheck, roles: ['ADMIN'], section: '관리' },
];

export function getMenuItems(role: MenuRole) {
  return menuItems.filter((item) => item.roles.includes(role));
}
