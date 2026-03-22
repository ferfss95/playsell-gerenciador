-- ============================================
-- CORREÇÃO RÁPIDA: Recursão Infinita RLS user_roles
-- ============================================
-- Execute este script no Supabase SQL Editor para corrigir o erro:
-- "infinite recursion detected in policy for relation user_roles"
-- ============================================

-- 1. Garantir que a função has_role existe e está correta
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Remover TODAS as políticas antigas da tabela user_roles
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- 3. Criar nova política de SELECT (permite todos verem roles)
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- 4. Criar nova política de INSERT/UPDATE/DELETE (usa função has_role)
-- Esta política NÃO causa recursão porque has_role é SECURITY DEFINER
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Comentário na função
COMMENT ON FUNCTION public.has_role(UUID, app_role) IS 'Verifica se um usuário tem um role específico. Usa SECURITY DEFINER para evitar recursão infinita nas políticas RLS.';

-- 6. Criar função para inserir role (bypassa RLS completamente)
-- Esta função permite inserir roles mesmo quando não há admins cadastrados
CREATE OR REPLACE FUNCTION public.insert_user_role(
  _user_id UUID,
  _role app_role
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_id UUID;
BEGIN
  -- Remover role existente se houver (para evitar duplicatas)
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;
  
  -- Inserir novo role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  RETURNING id INTO _role_id;
  
  RETURN _role_id;
END;
$$;

-- Permitir que usuários autenticados e anônimos executem a função
GRANT EXECUTE ON FUNCTION public.insert_user_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_role(UUID, app_role) TO anon;

-- Comentário na função
COMMENT ON FUNCTION public.insert_user_role(UUID, app_role) IS 'Insere um role para um usuário, bypassando políticas RLS. Usa SECURITY DEFINER para permitir inserção mesmo quando não há admins cadastrados.';

-- 7. Criar política alternativa que permite inserção quando não há admins
-- Esta política permite inserir roles quando a tabela está vazia ou quando não há admins
DROP POLICY IF EXISTS "Allow initial role creation" ON public.user_roles;
CREATE POLICY "Allow initial role creation"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permitir se não houver nenhum admin cadastrado ainda
    NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE role = 'admin'
    )
    OR
    -- Ou se o usuário atual é admin (usando função has_role)
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ✅ Pronto! Agora você pode:
-- 1. Cadastrar o primeiro usuário (mesmo sem admins)
-- 2. Cadastrar usuários usando a função insert_user_role (bypassa RLS)
-- 3. Cadastrar usuários como admin (se já houver um admin)

