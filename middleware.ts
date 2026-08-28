import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseEnv } from '@/lib/supabase/env';
import { updateSupabaseSession } from '@/lib/supabase/update-session';

export async function middleware(request: NextRequest) {
  const response = await updateSupabaseSession(request);
  const protectedPath = request.nextUrl.pathname.startsWith('/user/') || request.nextUrl.pathname.startsWith('/admin/') || request.nextUrl.pathname === '/workflow';
  if (!protectedPath) return response;
  const { url, publishableKey } = requireSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, { cookies: { getAll: () => request.cookies.getAll(), setAll: () => undefined } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = { matcher: ['/user/:path*', '/admin/:path*', '/workflow'] };
