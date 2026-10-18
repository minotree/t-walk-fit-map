import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export function requireSupabase(): void {
  if (!url || !key) throw new Error('Supabase 연결 설정이 필요합니다.');
}
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
