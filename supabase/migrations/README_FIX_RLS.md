# 🔧 Correção de Recursão Infinita nas Políticas RLS

## ⚠️ Problema

Ao tentar cadastrar um usuário, ocorre o erro:
```
infinite recursion detected in policy for relation "user_roles"
```

## 🔍 Causa

A política RLS "Only admins can manage roles" estava tentando verificar se o usuário é admin consultando a própria tabela `user_roles`, criando um loop infinito:

```sql
-- ❌ POLÍTICA PROBLEMÁTICA (causa recursão)
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles  -- ← Consulta a própria tabela!
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## ✅ Solução

A migração `20250202000000_fix_user_roles_rls_recursion.sql` corrige o problema usando a função `has_role` que é `SECURITY DEFINER` e não causa recursão:

```sql
-- ✅ POLÍTICA CORRIGIDA (usa função SECURITY DEFINER)
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
```

## 📝 Como Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Abra o arquivo `playsell-gerenciador/supabase/migrations/20250202000000_fix_user_roles_rls_recursion.sql`
5. Copie todo o conteúdo
6. Cole no SQL Editor
7. Clique em **Run** ou pressione `Ctrl+Enter`
8. Verifique se não há erros

### Opção 2: Via Supabase CLI

```bash
cd playsell-gerenciador
npx supabase db push
```

## ✅ Verificação

Após aplicar a migração, verifique:

1. A função `has_role` existe e está correta:
```sql
SELECT proname FROM pg_proc WHERE proname = 'has_role';
```

2. As políticas RLS foram atualizadas:
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_roles';
```

3. Tente cadastrar um usuário novamente - o erro não deve mais ocorrer

## 🔐 Importante

- A função `has_role` usa `SECURITY DEFINER`, o que significa que ela executa com as permissões do criador da função, não do usuário que a chama
- Isso permite que a função acesse a tabela `user_roles` sem passar pelas políticas RLS, evitando recursão
- A função é `STABLE`, o que significa que sempre retorna o mesmo resultado para os mesmos parâmetros (otimização do PostgreSQL)

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)




