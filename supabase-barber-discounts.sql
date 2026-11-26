-- ==============================================================================
-- MIGRAÇÃO SUPABASE: Desconto Promocional por Barbeiro (Iniciante / Júnior)
-- Fratres Barbearia
-- ==============================================================================

-- 1. Adicionar colunas de desconto na tabela de usuários
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS discount_badge TEXT DEFAULT '';

-- 2. Atualizar a View Pública Segura dos Barbeiros (para o BookingWizard dos clientes ler o desconto)
DROP VIEW IF EXISTS public.barbeiros_publicos CASCADE;

CREATE OR REPLACE VIEW public.barbeiros_publicos 
WITH (security_invoker = false)
AS
SELECT 
  id,
  organization_id,
  full_name,
  role,
  avatar_url,
  rating,
  active,
  discount_type,
  discount_value,
  discount_badge
FROM public.users
WHERE active = true;

GRANT SELECT ON public.barbeiros_publicos TO anon, authenticated;

-- 3. Atualizar política RLS para permitir que o barbeiro atualize suas próprias configurações
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.users;
CREATE POLICY "Users Update Own Profile" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() 
    OR auth_user_id = auth.uid() 
    OR (organization_id = public.get_auth_org_id() AND public.get_auth_user_role() IN ('owner', 'admin'))
  )
  WITH CHECK (
    id = auth.uid() 
    OR auth_user_id = auth.uid() 
    OR (organization_id = public.get_auth_org_id() AND public.get_auth_user_role() IN ('owner', 'admin'))
  );
