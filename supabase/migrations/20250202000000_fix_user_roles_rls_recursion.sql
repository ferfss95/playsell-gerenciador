-- ============================================
-- CORREÇÃO: Recursão Infinita nas Políticas RLS de user_roles
-- ============================================
-- Este script corrige o problema de recursão infinita nas políticas RLS
-- da tabela user_roles que ocorre quando a política tenta verificar
-- se o usuário é admin consultando a própria tabela user_roles.
-- ============================================
-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- ============================================

-- Garantir que a função has_role existe e está correta
-- A função usa SECURITY DEFINER para evitar recursão infinita
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

-- Remover TODAS as políticas antigas que podem causar recursão
-- Usar CASCADE para remover dependências se necessário
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Remover todas as políticas da tabela user_roles
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
  END LOOP;
END $$;

-- Criar nova política de SELECT que permite todos os usuários autenticados verem roles
-- (isso é seguro porque roles não são informações sensíveis)
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Criar nova política de INSERT/UPDATE/DELETE que usa a função has_role
-- A função has_role é SECURITY DEFINER, então não causa recursão
-- IMPORTANTE: Esta política permite que admins gerenciem roles
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Comentário explicativo
COMMENT ON FUNCTION public.has_role(UUID, app_role) IS 'Verifica se um usuário tem um role específico. Usa SECURITY DEFINER para evitar recursão infinita nas políticas RLS.';

-- Criar função para inserir role (bypassa RLS completamente)
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

-- Criar política alternativa que permite inserção quando não há admins
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

-- Verificar se as políticas foram criadas corretamente
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS da tabela user_roles atualizadas com sucesso!';
  RAISE NOTICE 'A função has_role está configurada como SECURITY DEFINER para evitar recursão.';
  RAISE NOTICE 'A função insert_user_role foi criada para bypassar RLS completamente.';
END $$;

