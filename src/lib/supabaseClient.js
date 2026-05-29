import { createClient } from '@supabase/supabase-js';

const LIVE_SUPABASE_URL = 'https://dtddjgmmhrbjbmuuxcmf.supabase.co';
const LIVE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5UGJvWo_VxLqwSJ6lkaDeg_0lJC0QTJ';

// Vercel may still have stale project env vars; keep production pinned to the live app backend.
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
const liveSupabaseHost = new URL(LIVE_SUPABASE_URL).host;
const configuredHost = supabaseUrl ? new URL(supabaseUrl).host : '';
const hasUnexpectedProject = Boolean(configuredHost && configuredHost !== liveSupabaseHost);
const resolvedSupabaseUrl = hasUnexpectedProject || !supabaseUrl ? LIVE_SUPABASE_URL : supabaseUrl;
const resolvedSupabaseKey = hasUnexpectedProject || !supabaseAnonKey ? LIVE_SUPABASE_PUBLISHABLE_KEY : supabaseAnonKey;

export const supabaseConfigStatus = {
  hasUrl: Boolean(rawSupabaseUrl),
  hasKey: Boolean(supabaseAnonKey || LIVE_SUPABASE_PUBLISHABLE_KEY),
  isValidUrl: Boolean(resolvedSupabaseUrl),
  host: new URL(resolvedSupabaseUrl).host,
  configuredHost,
  expectedHost: liveSupabaseHost,
  ignoredConfiguredHost: hasUnexpectedProject,
  usingRepoFallback: hasUnexpectedProject || !supabaseUrl || !supabaseAnonKey,
  missing: [
    !rawSupabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY' : null,
    rawSupabaseUrl && !supabaseUrl ? 'valid https Supabase URL' : null,
  ].filter(Boolean),
};

export const hasSupabaseConfig = Boolean(resolvedSupabaseUrl && resolvedSupabaseKey);

export const supabase = hasSupabaseConfig
  ? createClient(resolvedSupabaseUrl, resolvedSupabaseKey)
  : null;
