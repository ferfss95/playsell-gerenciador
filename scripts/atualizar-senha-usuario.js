/**
 * Script para atualizar senha de usuário no Supabase Auth
 * 
 * Uso:
 * node scripts/atualizar-senha-usuario.js <email> <nova-senha>
 * 
 * Exemplo:
 * node scripts/atualizar-senha-usuario.js ana.silva@empresa.com 1001
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

async function atualizarSenha(email, novaSenha) {
  try {
    // Buscar usuário pelo email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Erro ao listar usuários: ${listError.message}`);
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error(`Usuário com email ${email} não encontrado`);
    }

    // Atualizar senha
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: novaSenha
    });

    if (error) {
      throw new Error(`Erro ao atualizar senha: ${error.message}`);
    }

    console.log(`✅ Senha atualizada com sucesso para ${email}!`);
    console.log(`   ID do usuário: ${user.id}`);
    console.log(`   Nova senha: ${novaSenha}`);
    
    return data;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Obter argumentos da linha de comando
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Uso: node scripts/atualizar-senha-usuario.js <email> <nova-senha>');
  console.error('');
  console.error('Exemplo:');
  console.error('  node scripts/atualizar-senha-usuario.js ana.silva@empresa.com 1001');
  process.exit(1);
}

const [email, novaSenha] = args;

atualizarSenha(email, novaSenha);

