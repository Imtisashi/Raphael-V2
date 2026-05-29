import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const normalizeSupabaseUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' ? parsed.origin : '';
  } catch {
    return '';
  }
};

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

export const supabaseConfigStatus = {
  hasUrl: Boolean(rawSupabaseUrl),
  hasKey: Boolean(supabaseAnonKey),
  isValidUrl: Boolean(supabaseUrl),
  host: supabaseUrl ? new URL(supabaseUrl).host : '',
  missing: [
    !rawSupabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY' : null,
    rawSupabaseUrl && !supabaseUrl ? 'valid https Supabase URL' : null,
  ].filter(Boolean),
};

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
