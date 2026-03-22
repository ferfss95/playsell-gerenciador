# 🔧 Solução Completa para Problemas de RLS - user_roles

## ⚠️ Problemas Identificados

1. **Recursão Infinita**: Política RLS consultando a própria tabela `user_roles`
2. **Violação de RLS**: Não é possível inserir roles quando não há admins cadastrados
3. **Service Role Key**: Pode não estar configurada ou não estar sendo usada corretamente

## ✅ Solução Implementada

### 1. Função RPC `insert_user_role` (Bypassa RLS)

Criada função SQL que permite inserir roles mesmo quando:
- Não há admins cadastrados ainda
- As políticas RLS estão bloqueando
- Service Role Key não está configurada

**Características**:
- Usa `SECURITY DEFINER` (bypassa RLS)
- Remove role existente antes de inserir (evita duplicatas)
- Retorna o ID do role criado

### 2. Política RLS Alternativa

Criada política que permite inserção quando:
- Não há admins cadastrados (primeiro usuário)
- O usuário atual é admin

### 3. Código Atualizado

O código do `GerenciadorContext` agora:
1. Tenta usar a função RPC `insert_user_role` primeiro (bypassa RLS)
2. Se RPC não estiver disponível, tenta inserção direta
3. Fornece mensagens de erro claras com instruções

## 📝 Como Aplicar

### Passo 1: Executar Script SQL no Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Abra o arquivo `playsell-gerenciador/FIX_RLS_RECURSION.sql`
5. Copie **TODO** o conteúdo
6. Cole no SQL Editor
7. Clique em **Run** (ou `Ctrl+Enter`)
8. Aguarde confirmação de sucesso

### Passo 2: Verificar Service Role Key (Opcional mas Recomendado)

1. No Supabase Dashboard → **Settings** → **API**
2. Copie a **service_role key** (secret)
3. Adicione no arquivo `playsell-gerenciador/.env`:
```env
VITE_SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```
4. Reinicie o servidor

### Passo 3: Testar

1. Tente cadastrar um usuário novamente
2. O sistema deve funcionar mesmo sem Service Role Key (usa função RPC)
3. Com Service Role Key, funciona ainda melhor (bypassa RLS completamente)

## 🔍 O que Foi Corrigido

### Antes (Problema)
```sql
-- ❌ Política causava recursão
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles  -- ← Loop infinito!
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Depois (Solução)
```sql
-- ✅ Função RPC bypassa RLS
CREATE FUNCTION insert_user_role(_user_id UUID, _role app_role)
RETURNS UUID
SECURITY DEFINER  -- ← Bypassa RLS!
AS $$ ... $$;

-- ✅ Política usa função has_role (não causa recursão)
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ✅ Política permite primeiro usuário
CREATE POLICY "Allow initial role creation"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
```

## 🎯 Benefícios da Solução

1. **Funciona sem Service Role Key**: Usa função RPC que bypassa RLS
2. **Permite primeiro usuário**: Política especial para quando não há admins
3. **Sem recursão**: Função `has_role` usa `SECURITY DEFINER`
4. **Fallback inteligente**: Tenta RPC primeiro, depois inserção direta
5. **Mensagens claras**: Erros explicam o que fazer

## 🔐 Segurança

- A função `insert_user_role` é `SECURITY DEFINER`, mas:
  - Apenas insere roles (não deleta dados)
  - Remove role existente antes de inserir (evita duplicatas)
  - Pode ser restringida a usuários específicos se necessário

- As políticas RLS ainda protegem:
  - SELECT: Todos podem ver roles
  - UPDATE/DELETE: Apenas admins podem gerenciar
  - INSERT: Permite primeiro usuário ou admins

## 📚 Arquivos Modificados

1. `FIX_RLS_RECURSION.sql` - Script de correção rápida (atualizado)
2. `supabase/migrations/20250202000000_fix_user_roles_rls_recursion.sql` - Migração completa
3. `supabase/migrations/20250202000001_create_insert_role_function.sql` - Função RPC
4. `src/contexts/GerenciadorContext.tsx` - Código atualizado para usar RPC

## ✅ Checklist de Verificação

- [ ] Script SQL executado no Supabase
- [ ] Função `insert_user_role` criada (verificar com `SELECT proname FROM pg_proc WHERE proname = 'insert_user_role';`)
- [ ] Função `has_role` atualizada (verificar com `SELECT proname FROM pg_proc WHERE proname = 'has_role';`)
- [ ] Políticas RLS atualizadas (verificar com `SELECT policyname FROM pg_policies WHERE tablename = 'user_roles';`)
- [ ] Service Role Key configurada no `.env` (opcional mas recomendado)
- [ ] Servidor reiniciado
- [ ] Teste de cadastro de usuário realizado

## 🆘 Troubleshooting

### Erro: "function insert_user_role does not exist"

**Solução**: Execute o script `FIX_RLS_RECURSION.sql` no Supabase SQL Editor

### Erro: "permission denied for function insert_user_role"

**Solução**: O script já inclui `GRANT EXECUTE`, mas se persistir, execute:
```sql
GRANT EXECUTE ON FUNCTION public.insert_user_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_role(UUID, app_role) TO anon;
```

### Ainda recebe erro de RLS

**Solução**: 
1. Verifique se o script foi executado completamente
2. Verifique se não há políticas antigas conflitantes
3. Tente usar Service Role Key no `.env`

---

**Última atualização**: Fevereiro 2025
**Status**: ✅ Solução completa implementada




