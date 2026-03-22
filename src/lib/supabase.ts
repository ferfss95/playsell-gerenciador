import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/** Supabase bloqueia chaves sb_secret_* no navegador ("Forbidden use of secret API key in browser"). */
function isForbiddenBrowserKey(k: string | undefined): boolean {
  return typeof k === 'string' && k.trim().startsWith('sb_secret_');
}

/**
 * Chave segura para createClient no browser: publishable, anon ou service_role JWT (eyJ…).
 * Nunca usar VITE_SUPABASE_SECRET_KEY (sb_secret_*) no front — use em Edge Function / servidor.
 */
export function getBrowserSupabaseApiKey(): string | undefined {
  const pub = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const svc = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (pub && !isForbiddenBrowserKey(pub)) return pub;
  if (anon && !isForbiddenBrowserKey(anon)) return anon;
  if (svc && !isForbiddenBrowserKey(svc)) return svc;
  return undefined;
}

const supabaseKey = getBrowserSupabaseApiKey();

if (import.meta.env.DEV) {
  console.log('🔧 Configuração Supabase:', {
    url: supabaseUrl ? '✅ Configurado' : '❌ Não configurado',
    key: supabaseKey ? '✅ Chave segura para navegador' : '❌ Defina PUBLISHABLE ou ANON (sb_secret não funciona no browser)',
    publishable: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✅ Presente' : '⚠️ Ausente',
    anon: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Presente' : '⚠️ Ausente',
    serviceRoleJwt: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? '✅ Presente' : '⚠️ Ausente',
    secretIgnoredInBrowser: import.meta.env.VITE_SUPABASE_SECRET_KEY
      ? '⚠️ SECRET definida (use só em servidor; não é enviada ao createClient no browser)'
      : '—',
  });
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export function createEphemeralAuthClient(): SupabaseClient | null {
  const key = getBrowserSupabaseApiKey();
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

if (!supabase && import.meta.env.DEV) {
  console.error('❌ Supabase não configurado! No navegador use VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY.');
  console.error('Variáveis:', {
    VITE_SUPABASE_URL: supabaseUrl || 'NÃO ENCONTRADO',
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'ENCONTRADO' : 'NÃO ENCONTRADO',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'ENCONTRADO' : 'NÃO ENCONTRADO',
    VITE_SUPABASE_SERVICE_ROLE_KEY: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'ENCONTRADO' : 'NÃO ENCONTRADO',
  });
}
