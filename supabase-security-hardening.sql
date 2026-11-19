-- ==============================================================================
-- BLINDAGEM DE CIBERSEGURANÇA E LGPD: SUPABASE ROW LEVEL SECURITY (RLS)
-- Projeto: Fratres Barbearia
-- Objetivo: Proteger dados de clientes, bloquear scraping, isolar credenciais e 
--           permitir consulta de disponibilidade apenas por views higienizadas.
-- Execução: 100% idempotente (pode rodar quantas vezes precisar sem erros de duplicidade)
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÕES AUXILIARES DE CONTEXTO (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1;
$$;

-- ==============================================================================
-- 3. REMOÇÃO COMPLETA DE POLÍTICAS EXISTENTES (GARANTIR IDEMPOTÊNCIA TOTAL)
-- ==============================================================================

-- Tabela appointments
DROP POLICY IF EXISTS "Public Read Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public Create Appointment" ON public.appointments;
DROP POLICY IF EXISTS "Tenant Manage Own Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber Read Own Org Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber Insert Own Org Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber Update Own Org Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber Delete Own Org Appointments" ON public.appointments;

-- Tabela users
DROP POLICY IF EXISTS "Public Read Barbers" ON public.users;
DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Tenant Manage Own Team" ON public.users;
DROP POLICY IF EXISTS "Auth Users View Org Team" ON public.users;
DROP POLICY IF EXISTS "Auth Owners Manage Org Team" ON public.users;

-- Tabela customer_subscriptions
DROP POLICY IF EXISTS "Public Read Subscriptions Verification" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Public Read Subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Tenant Manage Own Subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Auth Manage Subscriptions" ON public.customer_subscriptions;

-- Tabela organizations
DROP POLICY IF EXISTS "Public Read Organizations" ON public.organizations;
DROP POLICY IF EXISTS "Tenant Manage Own Organization" ON public.organizations;

-- Tabela services
DROP POLICY IF EXISTS "Public Read Services" ON public.services;
DROP POLICY IF EXISTS "Tenant Manage Own Services" ON public.services;

-- Tabela products
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Tenant Manage Own Products" ON public.products;

-- Tabela schedules
DROP POLICY IF EXISTS "Public Read Schedules" ON public.schedules;
DROP POLICY IF EXISTS "Tenant Manage Own Schedules" ON public.schedules;

-- Tabela membership_plans
DROP POLICY IF EXISTS "Public Read Plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Public Read Active Plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Tenant Manage Own Plans" ON public.membership_plans;

-- ==============================================================================
-- 4. BLINDAGEM DA TABELA DE AGENDAMENTOS (LGPD - ZERO DADOS A USUÁRIOS ANÔNIMOS)
-- ==============================================================================
-- Revoga expressamente qualquer permissão direta de SELECT/UPDATE/DELETE na tabela appointments para anon
REVOKE ALL ON public.appointments FROM anon;

-- Usuários Autenticados (Barbeiros e Administradores) só acessam agendamentos da própria barbearia
DROP POLICY IF EXISTS "Barber Read Own Org Appointments" ON public.appointments;
CREATE POLICY "Barber Read Own Org Appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Barber Insert Own Org Appointments" ON public.appointments;
CREATE POLICY "Barber Insert Own Org Appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Barber Update Own Org Appointments" ON public.appointments;
CREATE POLICY "Barber Update Own Org Appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Barber Delete Own Org Appointments" ON public.appointments;
CREATE POLICY "Barber Delete Own Org Appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (organization_id = public.get_auth_org_id());

-- ==============================================================================
-- 5. VIEW PÚBLICA SEGURA: horarios_ocupados
-- Retorna EXCLUSIVAMENTE data, horário e ID do profissional para montar a grade.
-- Nenhum nome, telefone, e-mail ou observação do cliente é exposto.
-- ==============================================================================
DROP VIEW IF EXISTS public.horarios_ocupados CASCADE;

CREATE OR REPLACE VIEW public.horarios_ocupados 
WITH (security_invoker = false)
AS
SELECT 
  id,
  organization_id,
  user_id,
  start_time,
  end_time,
  status
FROM public.appointments
WHERE status IN ('confirmed', 'completed', 'pending');

-- Concede leitura anônima e autenticada apenas a esta View estritamente filtrada
GRANT SELECT ON public.horarios_ocupados TO anon, authenticated;

-- ==============================================================================
-- 6. VIEW PÚBLICA SEGURA: barbeiros_publicos
-- Expõe apenas os dados públicos dos profissionais (nome, foto, nota) sem vazar 
-- access_password ou credenciais internas.
-- ==============================================================================
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
  active
FROM public.users
WHERE active = true;

GRANT SELECT ON public.barbeiros_publicos TO anon, authenticated;

-- Políticas para a tabela base users
DROP POLICY IF EXISTS "Auth Users View Org Team" ON public.users;
CREATE POLICY "Auth Users View Org Team" ON public.users
  FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_org_id() OR id = auth.uid() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Auth Owners Manage Org Team" ON public.users;
CREATE POLICY "Auth Owners Manage Org Team" ON public.users
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id() AND public.get_auth_user_role() IN ('owner', 'admin'))
  WITH CHECK (organization_id = public.get_auth_org_id() AND public.get_auth_user_role() IN ('owner', 'admin'));

-- ==============================================================================
-- 7. PROTEÇÃO DE ASSINATURAS VIP (LGPD)
-- ==============================================================================
REVOKE SELECT ON public.customer_subscriptions FROM anon;

DROP POLICY IF EXISTS "Auth Manage Subscriptions" ON public.customer_subscriptions;
CREATE POLICY "Auth Manage Subscriptions" ON public.customer_subscriptions
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

-- Função RPC segura para verificar elegibilidade de desconto sem permitir dump da tabela
CREATE OR REPLACE FUNCTION public.verificar_assinatura_cliente(p_org_id UUID, p_phone TEXT)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  cuts_remaining INT,
  plan_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_phone TEXT := regexp_replace(p_phone, '\D', '', 'g');
BEGIN
  RETURN QUERY
  SELECT 
    (cs.status = 'active' AND (cs.cuts_total - cs.cuts_used) > 0) AS has_active_subscription,
    GREATEST(0, cs.cuts_total - cs.cuts_used) AS cuts_remaining,
    mp.name AS plan_name
  FROM public.customer_subscriptions cs
  JOIN public.membership_plans mp ON mp.id = cs.plan_id
  WHERE cs.organization_id = p_org_id
    AND regexp_replace(cs.client_phone, '\D', '', 'g') = clean_phone
    AND cs.status = 'active'
  ORDER BY cs.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_assinatura_cliente(UUID, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 8. POLÍTICAS PÚBLICAS PARA RECURSOS GERAIS (CATÁLOGO, PRODUTOS, HORÁRIOS)
-- ==============================================================================
DROP POLICY IF EXISTS "Public Read Organizations" ON public.organizations;
CREATE POLICY "Public Read Organizations" ON public.organizations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read Services" ON public.services;
CREATE POLICY "Public Read Services" ON public.services
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "Public Read Products" ON public.products
  FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS "Public Read Schedules" ON public.schedules;
CREATE POLICY "Public Read Schedules" ON public.schedules
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read Active Plans" ON public.membership_plans;
CREATE POLICY "Public Read Active Plans" ON public.membership_plans
  FOR SELECT TO anon, authenticated USING (active = true);

-- Políticas de Gerenciamento do Dono
DROP POLICY IF EXISTS "Tenant Manage Own Organization" ON public.organizations;
CREATE POLICY "Tenant Manage Own Organization" ON public.organizations
  FOR ALL TO authenticated
  USING (id = public.get_auth_org_id())
  WITH CHECK (id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Tenant Manage Own Services" ON public.services;
CREATE POLICY "Tenant Manage Own Services" ON public.services
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Tenant Manage Own Products" ON public.products;
CREATE POLICY "Tenant Manage Own Products" ON public.products
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Tenant Manage Own Schedules" ON public.schedules;
CREATE POLICY "Tenant Manage Own Schedules" ON public.schedules
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "Tenant Manage Own Plans" ON public.membership_plans;
CREATE POLICY "Tenant Manage Own Plans" ON public.membership_plans
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());
