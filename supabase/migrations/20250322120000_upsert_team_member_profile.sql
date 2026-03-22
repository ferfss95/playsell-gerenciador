-- Perfis: o gerenciador usa cliente anon / JWT que não é o novo usuário.
-- RLS em profiles não permite INSERT nem UPDATE de terceiros → este RPC (SECURITY DEFINER)
-- espelha insert_user_role: usado só pelo fluxo de cadastro no gerenciador.

CREATE OR REPLACE FUNCTION public.upsert_team_member_profile(
  _id UUID,
  _full_name TEXT,
  _enrollment_number TEXT,
  _store_id TEXT,
  _regional_id TEXT,
  _store TEXT,
  _regional TEXT,
  _avatar_initials TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.profiles;
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    enrollment_number,
    store_id,
    regional_id,
    store,
    regional,
    avatar_initials
  )
  VALUES (
    _id,
    _full_name,
    NULLIF(TRIM(_enrollment_number), ''),
    NULLIF(TRIM(_store_id), ''),
    NULLIF(TRIM(_regional_id), ''),
    NULLIF(TRIM(_store), ''),
    NULLIF(TRIM(_regional), ''),
    NULLIF(TRIM(_avatar_initials), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    enrollment_number = EXCLUDED.enrollment_number,
    store_id = EXCLUDED.store_id,
    regional_id = EXCLUDED.regional_id,
    store = EXCLUDED.store,
    regional = EXCLUDED.regional,
    avatar_initials = EXCLUDED.avatar_initials,
    updated_at = NOW()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_team_member_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_team_member_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_team_member_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

COMMENT ON FUNCTION public.upsert_team_member_profile IS
  'Insere/atualiza perfil de membro criado pelo gerenciador; bypassa RLS (como insert_user_role).';
