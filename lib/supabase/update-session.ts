import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseEnv } from './env';

export async function updateSupabaseSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { url, publishableKey } = requireSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}
