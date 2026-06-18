import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    'Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'in your Vercel dashboard (Settings > Environment Variables) and .env.local.';
  // Hard fail in production — no fallback to fake URLs that silently break OAuth.
  throw new Error(msg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
