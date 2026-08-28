"use client";

import { Bell, LogOut, Search, Settings } from "lucide-react";
import { logout } from "@/app/(user)/logout-action";

export default function Topbar({ title = "월간 발주계획" }: { title?: string }) {
  return <header className="topbar"><div><div className="eyebrow">MONTHLY PROCUREMENT CONTROL</div><h1>{title}</h1></div><div className="top-meta"><div className="top-search"><Search size={14} /><input aria-label="검색" placeholder="품목·공급처 검색" /></div><button className="icon-button" aria-label="알림"><Bell size={17} /></button><button className="icon-button" aria-label="설정"><Settings size={17} /></button><form action={logout}><button className="icon-button" aria-label="로그아웃" type="submit"><LogOut size={17} /></button></form><span className="user-avatar">SC</span></div></header>;
}
