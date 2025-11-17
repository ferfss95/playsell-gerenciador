import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Para o gerenciador, usar service role key para operações administrativas
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Verificar se as variáveis estão sendo carregadas (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🔧 Configuração Supabase:', {
    url: supabaseUrl ? '✅ Configurado' : '❌ Não configurado',
    key: supabaseKey ? '✅ Configurado' : '❌ Não configurado',
    serviceRole: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? '✅ Service Role Key presente' : '⚠️ Service Role Key ausente',
  });
}

// Criar cliente Supabase apenas se as variáveis estiverem configuradas
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

// Log de erro se não estiver configurado
if (!supabase && import.meta.env.DEV) {
  console.error('❌ Supabase não configurado! Verifique o arquivo .env');
  console.error('Variáveis esperadas:', {
    VITE_SUPABASE_URL: supabaseUrl || 'NÃO ENCONTRADO',
    VITE_SUPABASE_SERVICE_ROLE_KEY: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'ENCONTRADO' : 'NÃO ENCONTRADO',
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'ENCONTRADO' : 'NÃO ENCONTRADO',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'ENCONTRADO' : 'NÃO ENCONTRADO',
  });
}



