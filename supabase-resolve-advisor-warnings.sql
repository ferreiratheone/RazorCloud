-- ==============================================================================
-- RESOLUÇÃO COMPLETA DOS ALERTAS DO SUPABASE SECURITY & PERFORMANCE ADVISOR
-- Fratres Barbearia
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CORREÇÃO DOS ALERTAS CRÍTICOS: Security Definer View
-- Transforma as Views em "security_invoker = true" para eliminar o alerta crítico,
-- mantendo a proteção estrita via RLS e permissões de colunas específicas.
-- ------------------------------------------------------------------------------

-- A. VIEW horarios_ocupados
DROP VIEW IF EXISTS public.horarios_ocupados CASCADE;

CREATE OR REPLACE VIEW public.horarios_ocupados 
WITH (security_invoker = true)
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

GRANT SELECT ON public.horarios_ocupados TO anon, authenticated;

-- Permitir que anon consulte apenas status de agendamento na tabela base appointments (para alimentar a view)
-- Concede permissão de SELECT apenas nas colunas não sensíveis (sem vazar nome ou telefone de clientes)
GRANT SELECT (id, organization_id, user_id, start_time, end_time, status) ON public.appointments TO anon;

DROP POLICY IF EXISTS "Anon Read Busy Slots" ON public.appointments;
CREATE POLICY "Anon Read Busy Slots" ON public.appointments
  FOR SELECT TO anon
  USING (status IN ('confirmed', 'completed', 'pending'));


-- B. VIEW barbeiros_publicos
DROP VIEW IF EXISTS public.barbeiros_publicos CASCADE;

CREATE OR REPLACE VIEW public.barbeiros_publicos 
WITH (security_invoker = true)
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

-- Concede leitura anônima apenas nas colunas públicas da tabela users (sem expor senhas ou dados sensíveis)
GRANT SELECT (id, organization_id, full_name, role, avatar_url, rating, active, discount_type, discount_value, discount_badge) ON public.users TO anon;

DROP POLICY IF EXISTS "Anon Read Public Barbers" ON public.users;
CREATE POLICY "Anon Read Public Barbers" ON public.users
  FOR SELECT TO anon
  USING (active = true);


-- ------------------------------------------------------------------------------
-- 2. CORREÇÃO: Public Can Execute SECURITY DEFINER Function
-- Restringe a execução de barber_change_password apenas a usuários autenticados
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'barber_change_password') THEN
    REVOKE EXECUTE ON FUNCTION public.barber_change_password(text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.barber_change_password(text) TO authenticated;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. CORREÇÃO: Function Search Path Mutable
-- Define search_path explícito para evitar vulnerabilidade de path injection
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 4. CORREÇÃO: Multiple Permissive Policies & Auth RLS Initialization Plan
-- Separa as políticas entre anon e authenticated para evitar políticas concorrentes
-- e encapsula chamadas auth em subqueries (select auth.uid()) para otimizar o plano
-- ------------------------------------------------------------------------------

-- Tabela ORGANIZATIONS
DROP POLICY IF EXISTS "Public Read Organizations" ON public.organizations;
DROP POLICY IF EXISTS "Tenant Manage Own Organization" ON public.organizations;

CREATE POLICY "Anon Read Organizations" ON public.organizations
  FOR SELECT TO anon USING (true);

CREATE POLICY "Auth Manage Own Organization" ON public.organizations
  FOR ALL TO authenticated
  USING (id = (SELECT public.get_auth_org_id()))
  WITH CHECK (id = (SELECT public.get_auth_org_id()));

-- Tabela SERVICES
DROP POLICY IF EXISTS "Public Read Services" ON public.services;
DROP POLICY IF EXISTS "Tenant Manage Own Services" ON public.services;

CREATE POLICY "Anon Read Services" ON public.services
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "Auth Manage Own Services" ON public.services
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.get_auth_org_id()))
  WITH CHECK (organization_id = (SELECT public.get_auth_org_id()));

-- Tabela PRODUCTS
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Tenant Manage Own Products" ON public.products;

CREATE POLICY "Anon Read Products" ON public.products
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "Auth Manage Own Products" ON public.products
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.get_auth_org_id()))
  WITH CHECK (organization_id = (SELECT public.get_auth_org_id()));

-- Tabela SCHEDULES
DROP POLICY IF EXISTS "Public Read Schedules" ON public.schedules;
DROP POLICY IF EXISTS "Tenant Manage Own Schedules" ON public.schedules;

CREATE POLICY "Anon Read Schedules" ON public.schedules
  FOR SELECT TO anon USING (true);

CREATE POLICY "Auth Manage Own Schedules" ON public.schedules
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.get_auth_org_id()))
  WITH CHECK (organization_id = (SELECT public.get_auth_org_id()));

-- Tabela MEMBERSHIP_PLANS
DROP POLICY IF EXISTS "Public Read Plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Public Read Active Plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Tenant Manage Own Plans" ON public.membership_plans;

CREATE POLICY "Anon Read Active Plans" ON public.membership_plans
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "Auth Manage Own Plans" ON public.membership_plans
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.get_auth_org_id()))
  WITH CHECK (organization_id = (SELECT public.get_auth_org_id()));

-- Tabela USERS
DROP POLICY IF EXISTS "Public Read Barbers" ON public.users;
DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Tenant Manage Own Team" ON public.users;
DROP POLICY IF EXISTS "Auth Users View Org Team" ON public.users;
DROP POLICY IF EXISTS "Auth Owners Manage Org Team" ON public.users;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.users;

-- 1. Leitura por usuários autenticados da mesma organização
CREATE POLICY "Auth View Org Team" ON public.users
  FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT public.get_auth_org_id()) 
    OR id = (SELECT auth.uid()) 
    OR auth_user_id = (SELECT auth.uid())
  );

-- 2. Modificação por donos/administradores ou pelo próprio usuário
CREATE POLICY "Auth Manage Team Members" ON public.users
  FOR ALL TO authenticated
  USING (
    (organization_id = (SELECT public.get_auth_org_id()) AND (SELECT public.get_auth_user_role()) IN ('owner', 'admin'))
    OR id = (SELECT auth.uid())
    OR auth_user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (organization_id = (SELECT public.get_auth_org_id()) AND (SELECT public.get_auth_user_role()) IN ('owner', 'admin'))
    OR id = (SELECT auth.uid())
    OR auth_user_id = (SELECT auth.uid())
  );

-- Tabela APPOINTMENTS (Otimizar chamadas auth com SELECT)
DROP POLICY IF EXISTS "Barber Read Own Org Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber Insert Own Org Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber Update Own Org Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber Delete Own Org Appointments" ON public.appointments;

CREATE POLICY "Barber Read Own Org Appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT public.get_auth_org_id()));

CREATE POLICY "Barber Insert Own Org Appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT public.get_auth_org_id()));

CREATE POLICY "Barber Update Own Org Appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT public.get_auth_org_id()))
  WITH CHECK (organization_id = (SELECT public.get_auth_org_id()));

CREATE POLICY "Barber Delete Own Org Appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT public.get_auth_org_id()));


-- ------------------------------------------------------------------------------
-- 5. CORREÇÃO: Duplicate Index em appointments
-- ------------------------------------------------------------------------------
-- Se existirem índices redundantes criados anteriormente, remove o índice simples duplicado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'appointments' AND indexname = 'idx_appointments_org') 
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'appointments' AND indexname = 'idx_appointments_org_date') THEN
    DROP INDEX IF EXISTS public.idx_appointments_org;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'appointments' AND indexname = 'idx_appointments_user') 
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'appointments' AND indexname = 'idx_appointments_barber') THEN
    DROP INDEX IF EXISTS public.idx_appointments_user;
  END IF;
END $$;
