-- ============================================
-- FUNÇÃO: Inserir Role com Bypass de RLS
-- ============================================
-- Esta função permite inserir roles na tabela user_roles
-- mesmo quando não há admins cadastrados ainda ou quando
-- as políticas RLS estão bloqueando.
-- ============================================
-- IMPORTANTE: Usa SECURITY DEFINER para bypassar RLS
-- ============================================

-- Criar função para inserir role (bypassa RLS)
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

-- Comentário na função
COMMENT ON FUNCTION public.insert_user_role(UUID, app_role) IS 'Insere um role para um usuário, bypassando políticas RLS. Usa SECURITY DEFINER para permitir inserção mesmo quando não há admins cadastrados.';

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.insert_user_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_role(UUID, app_role) TO anon;




