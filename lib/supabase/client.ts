// 브라우저(클라이언트 컴포넌트)에서 쓰는 Supabase 클라이언트입니다.
// ㄴSupabase URL Key로 앱에서 뭔가 실행할떄 Supabase Database에 붙여라

import { createClient } from '@supabase/supabase-js';  // supabase-js 불러완
import { requireSupabaseEnv } from './env';

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = requireSupabaseEnv();
  return createClient(url, publishableKey);
}
