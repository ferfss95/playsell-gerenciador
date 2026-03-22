# 🔧 Instruções para Corrigir Erro de Recursão Infinita RLS

## ⚠️ Erro

```
Erro ao salvar role no banco: infinite recursion detected in policy for relation "user_roles"
```

## ✅ Solução Rápida

### Passo 1: Acessar Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)

### Passo 2: Executar Script de Correção

1. Abra o arquivo `FIX_RLS_RECURSION.sql` neste projeto
2. Copie **TODO** o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
5. Aguarde a execução (deve aparecer "Success. No rows returned")

### Passo 3: Verificar

Após executar, tente cadastrar um usuário novamente. O erro não deve mais ocorrer.

## 🔍 O que o Script Faz?

1. **Cria/Atualiza a função `has_role`**: Função que verifica roles usando `SECURITY DEFINER` (não causa recursão)
2. **Remove políticas antigas**: Remove políticas que causam recursão infinita
3. **Cria novas políticas**: Políticas que usam a função `has_role` em vez de consultar diretamente a tabela

## 📝 Explicação Técnica

### Problema Original

A política RLS estava assim:
```sql
-- ❌ CAUSA RECURSÃO
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles  -- ← Consulta a própria tabela!
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
```

Isso cria um loop infinito:
1. Política verifica se usuário é admin
2. Para verificar, consulta `user_roles`
3. Consulta `user_roles` precisa verificar a política RLS
4. Volta ao passo 1 → Loop infinito!

### Solução

Usar função `SECURITY DEFINER`:
```sql
-- ✅ NÃO CAUSA RECURSÃO
USING (public.has_role(auth.uid(), 'admin'::app_role))
```

A função `has_role` é `SECURITY DEFINER`, então:
- Executa com permissões do criador da função
- Não passa pelas políticas RLS
- Não causa recursão

## 🆘 Se Ainda Tiver Problemas

1. **Verifique se a função foi criada**:
```sql
SELECT proname FROM pg_proc WHERE proname = 'has_role';
```

2. **Verifique as políticas**:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_roles';
```

3. **Verifique se Service Role Key está configurada**:
   - No arquivo `.env` do `playsell-gerenciador`
   - Variável: `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - Reinicie o servidor após adicionar

## 📚 Arquivos Relacionados

- `FIX_RLS_RECURSION.sql` - Script de correção rápida
- `supabase/migrations/20250202000000_fix_user_roles_rls_recursion.sql` - Migração completa
- `supabase/migrations/README_FIX_RLS.md` - Documentação técnica

---

**Última atualização**: Fevereiro 2025




