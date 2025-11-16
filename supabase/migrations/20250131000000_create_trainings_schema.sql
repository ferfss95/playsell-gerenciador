-- ============================================
-- MIGRAÇÃO: Estrutura de Treinamentos
-- ============================================
-- Cria tabelas para gerenciar treinamentos, vídeos, quizzes e atribuições
-- ============================================

-- Enum para escopo de treinamento (similar ao campaign_scope)
DO $$ BEGIN
  CREATE TYPE public.training_scope AS ENUM ('store', 'regional', 'company');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para status de treinamento
DO $$ BEGIN
  CREATE TYPE public.training_status AS ENUM ('draft', 'active', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para status de atribuição de treinamento
DO $$ BEGIN
  CREATE TYPE public.training_assignment_status AS ENUM ('assigned', 'in_progress', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABELA: trainings (Treinamentos)
-- ============================================

CREATE TABLE IF NOT EXISTS public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  reward_coins INTEGER DEFAULT 0,
  scope training_scope NOT NULL DEFAULT 'company',
  scope_id TEXT, -- ID da loja ou regional (NULL se for company)
  status training_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_trainings_created_by ON public.trainings(created_by);
CREATE INDEX IF NOT EXISTS idx_trainings_status ON public.trainings(status);
CREATE INDEX IF NOT EXISTS idx_trainings_scope ON public.trainings(scope, scope_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_trainings_updated_at ON public.trainings;
CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- TABELA: training_quizzes (Quizzes dos Treinamentos)
-- ============================================

CREATE TABLE IF NOT EXISTS public.training_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array de opções: ["Opção A", "Opção B", "Opção C", "Opção D"]
  correct_answer INTEGER NOT NULL, -- Índice da opção correta (0-based)
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_training_quizzes_training_id ON public.training_quizzes(training_id);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_order ON public.training_quizzes(training_id, order_index);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_training_quizzes_updated_at ON public.training_quizzes;
CREATE TRIGGER update_training_quizzes_updated_at
  BEFORE UPDATE ON public.training_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- TABELA: training_role_assignments (Atribuições por Cargo)
-- ============================================

CREATE TABLE IF NOT EXISTS public.training_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(training_id, role)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_training_role_assignments_training_id ON public.training_role_assignments(training_id);
CREATE INDEX IF NOT EXISTS idx_training_role_assignments_role ON public.training_role_assignments(role);

-- ============================================
-- TABELA: training_user_assignments (Atribuições Individuais)
-- ============================================

CREATE TABLE IF NOT EXISTS public.training_user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status training_assignment_status NOT NULL DEFAULT 'assigned',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  quiz_score INTEGER, -- Percentual de acertos no quiz (0-100)
  quiz_answers JSONB, -- Respostas do usuário: [0, 1, 2, ...]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(training_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_training_user_assignments_training_id ON public.training_user_assignments(training_id);
CREATE INDEX IF NOT EXISTS idx_training_user_assignments_user_id ON public.training_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_user_assignments_status ON public.training_user_assignments(status);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_training_user_assignments_updated_at ON public.training_user_assignments;
CREATE TRIGGER update_training_user_assignments_updated_at
  BEFORE UPDATE ON public.training_user_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_user_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas para trainings
DROP POLICY IF EXISTS "Anyone can view active trainings" ON public.trainings;
CREATE POLICY "Anyone can view active trainings"
  ON public.trainings FOR SELECT
  TO authenticated
  USING (status = 'active' OR created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can manage trainings" ON public.trainings;
CREATE POLICY "Admins can manage trainings"
  ON public.trainings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para training_quizzes
DROP POLICY IF EXISTS "Anyone can view quizzes of active trainings" ON public.training_quizzes;
CREATE POLICY "Anyone can view quizzes of active trainings"
  ON public.training_quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings
      WHERE trainings.id = training_quizzes.training_id
      AND (trainings.status = 'active' OR trainings.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.training_quizzes;
CREATE POLICY "Admins can manage quizzes"
  ON public.training_quizzes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para training_role_assignments
DROP POLICY IF EXISTS "Anyone can view role assignments" ON public.training_role_assignments;
CREATE POLICY "Anyone can view role assignments"
  ON public.training_role_assignments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage role assignments" ON public.training_role_assignments;
CREATE POLICY "Admins can manage role assignments"
  ON public.training_role_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para training_user_assignments
DROP POLICY IF EXISTS "Users can view own assignments" ON public.training_user_assignments;
CREATE POLICY "Users can view own assignments"
  ON public.training_user_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own assignments" ON public.training_user_assignments;
CREATE POLICY "Users can update own assignments"
  ON public.training_user_assignments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.training_user_assignments;
CREATE POLICY "Admins can manage all assignments"
  ON public.training_user_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

