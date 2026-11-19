-- ==============================================================================
-- ATUALIZAÇÃO: VISUALIZAÇÃO DE SENHA E REGRA DE 1 ALTERAÇÃO POR BARBEIRO
-- ==============================================================================
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)

-- 1. Adicionar colunas de senha visível e contador de alterações na tabela users
ALTER TABLE IF EXISTS public.users 
  ADD COLUMN IF NOT EXISTS access_password TEXT,
  ADD COLUMN IF NOT EXISTS password_changes_count INT NOT NULL DEFAULT 0;

-- 2. Atualizar a RPC de definir senha do barbeiro pelo Dono
CREATE OR REPLACE FUNCTION public.set_barber_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_auth_id UUID;
  v_caller_org_id UUID;
  v_target_org_id UUID;
  v_auth_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- 1. Obter auth id de quem está executando a ação
  v_caller_auth_id := auth.uid();

  -- 2. Localizar a organização do dono/administrador chamador
  SELECT organization_id INTO v_caller_org_id 
  FROM public.users 
  WHERE id = v_caller_auth_id OR auth_user_id = v_caller_auth_id 
  LIMIT 1;

  -- 3. Obter dados do barbeiro alvo
  SELECT organization_id, auth_user_id, email 
  INTO v_target_org_id, v_auth_user_id, v_user_email
  FROM public.users
  WHERE id = target_user_id;

  IF v_target_org_id IS NULL THEN
    SELECT organization_id, auth_user_id, email 
    INTO v_target_org_id, v_auth_user_id, v_user_email
    FROM public.users
    WHERE auth_user_id = target_user_id;
  END IF;

  -- Validação de tenant
  IF v_target_org_id IS NULL OR v_caller_org_id IS NULL OR v_caller_org_id != v_target_org_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permissão negada para alterar a senha deste usuário.');
  END IF;

  -- 4. Atualizar no auth.users se existir
  IF v_auth_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_auth_user_id;
  ELSIF v_user_email IS NOT NULL THEN
    SELECT id INTO v_auth_user_id 
    FROM auth.users 
    WHERE email = LOWER(TRIM(v_user_email)) 
    LIMIT 1;

    IF v_auth_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          updated_at = NOW()
      WHERE id = v_auth_user_id;

      UPDATE public.users 
      SET auth_user_id = v_auth_user_id 
      WHERE id = target_user_id;
    END IF;
  END IF;

  -- 5. Atualizar senha visível em public.users e resetar contador para permitir 1 nova alteração caso o dono queira
  UPDATE public.users 
  SET access_password = new_password,
      password_changes_count = 0,
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Senha atualizada com sucesso.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_barber_password(UUID, TEXT) TO authenticated, anon;

-- 3. Nova RPC: Barbeiro altera sua própria senha (permitido apenas 1 vez)
CREATE OR REPLACE FUNCTION public.barber_change_password(new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_auth_id UUID;
  v_user_id UUID;
  v_role TEXT;
  v_changes INT;
BEGIN
  v_caller_auth_id := auth.uid();
  IF v_caller_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você precisa estar logado para alterar sua senha.');
  END IF;

  SELECT id, role, COALESCE(password_changes_count, 0)
  INTO v_user_id, v_role, v_changes
  FROM public.users
  WHERE id = v_caller_auth_id OR auth_user_id = v_caller_auth_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil de usuário não encontrado.');
  END IF;

  -- Se for barbeiro e já tiver alterado 1 vez
  IF v_role = 'barber' AND v_changes >= 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'limit_reached', true,
      'error', 'Você já alterou sua senha 1 vez. Caso precise alterá-la novamente ou tenha esquecido, comunique o administrador/dono da barbearia.'
    );
  END IF;

  -- Atualizar no auth.users
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_caller_auth_id;

  -- Atualizar no public.users e incrementar o contador
  UPDATE public.users
  SET access_password = new_password,
      password_changes_count = v_changes + 1,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Senha alterada com sucesso.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.barber_change_password(TEXT) TO authenticated;
