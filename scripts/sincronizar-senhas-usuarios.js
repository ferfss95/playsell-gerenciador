/**
 * Script para sincronizar senhas de TODOS os usuários existentes
 * Atualiza a senha de cada usuário para ser igual à sua matrícula (preenchida se necessário)
 * 
 * Uso:
 * node scripts/sincronizar-senhas-usuarios.js
 * 
 * IMPORTANTE: Requer Service Role Key configurada no .env
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Carregar variáveis de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas!');
  console.error('Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_ROLE_KEY estão no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function sincronizarSenhas() {
  try {
    console.log('🔍 Buscando todos os usuários com matrícula...\n');
    
    // Buscar todos os perfis com matrícula
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, enrollment_number')
      .not('enrollment_number', 'is', null);
    
    if (profilesError) {
      throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('ℹ️ Nenhum usuário com matrícula encontrado.');
      return;
    }
    
    console.log(`📋 Encontrados ${profiles.length} usuário(s) com matrícula.\n`);
    
    let sucesso = 0;
    let erros = 0;
    const errosDetalhados = [];
    
    for (const profile of profiles) {
      if (!profile.enrollment_number) {
        console.log(`⚠️ Pulando ${profile.email}: sem matrícula`);
        continue;
      }
      
      let novaSenha = profile.enrollment_number.trim();
      
      // Se a matrícula for menor que 6 caracteres, preencher com zeros
      if (novaSenha.length < 6) {
        novaSenha = novaSenha.padStart(6, '0');
      }
      
      try {
        console.log(`🔄 Atualizando ${profile.email}...`);
        console.log(`   Matrícula: ${profile.enrollment_number} → Senha: ${novaSenha}`);
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
          password: novaSenha
        });
        
        if (updateError) {
          console.error(`   ❌ Erro: ${updateError.message}`);
          erros++;
          errosDetalhados.push({
            email: profile.email,
            erro: updateError.message
          });
        } else {
          console.log(`   ✅ Senha atualizada com sucesso!`);
          sucesso++;
        }
      } catch (error) {
        console.error(`   ❌ Erro inesperado: ${error.message}`);
        erros++;
        errosDetalhados.push({
          email: profile.email,
          erro: error.message
        });
      }
      
      console.log(''); // Linha em branco
    }
    
    // Resumo
    console.log('='.repeat(50));
    console.log('📊 RESUMO:');
    console.log(`✅ Sucesso: ${sucesso}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('='.repeat(50));
    
    if (errosDetalhados.length > 0) {
      console.log('\n❌ Erros detalhados:');
      errosDetalhados.forEach(({ email, erro }) => {
        console.log(`   - ${email}: ${erro}`);
      });
    }
    
    if (sucesso > 0) {
      console.log('\n✅ Processo concluído!');
      console.log('Agora todos os usuários podem fazer login com sua matrícula (ou versão preenchida).');
    }
    
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

sincronizarSenhas();

