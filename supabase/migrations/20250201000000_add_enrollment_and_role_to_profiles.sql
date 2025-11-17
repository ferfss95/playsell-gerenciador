-- Migração para garantir que os campos enrollment_number e role estão configurados corretamente
-- Esta migração é idempotente e pode ser executada múltiplas vezes

-- ============================================
-- GARANTIR CAMPO enrollment_number EM profiles
-- ============================================

DO $$ 
BEGIN
  -- Verificar se a tabela existe antes de adicionar campos
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Adicionar enrollment_number se não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'enrollment_number'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN enrollment_number VARCHAR(255);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_enrollment_number 
        ON public.profiles(enrollment_number) 
        WHERE enrollment_number IS NOT NULL;
      
      COMMENT ON COLUMN public.profiles.enrollment_number IS 'Número de matrícula único do usuário';
    END IF;
  END IF;
END $$;

-- ============================================
-- GARANTIR TABELA user_roles E ESTRUTURA
-- ============================================

-- Criar enum app_role se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'leader', 'user');
  END IF;
END $$;

-- Criar tabela user_roles se não existir
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_roles
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN public.profiles.enrollment_number IS 'Número de matrícula único do usuário (opcional)';
COMMENT ON TABLE public.user_roles IS 'Tabela que armazena os papéis (roles) dos usuários no sistema';
COMMENT ON COLUMN public.user_roles.role IS 'Papel do usuário: admin (administrador), leader (líder), user (usuário padrão)';


