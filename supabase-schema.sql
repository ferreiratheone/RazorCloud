-- ==============================================================================
-- SCHEMA DDL DEFINITIVO, COMPLETO & BLINDADO (DEVSECOPS): RazorCloud SaaS
-- Execute este script completo no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABELAS PRINCIPAIS MULTI-TENANT
-- ==============================================================================

-- A. TABELA ORGANIZATIONS (Barbearias / Estabelecimentos)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  plans_enabled BOOLEAN NOT NULL DEFAULT true,
  products_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_auto_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_api_url TEXT,
  whatsapp_api_instance TEXT,
  whatsapp_api_token TEXT,
  whatsapp_reminder_hours INT NOT NULL DEFAULT 2,
  whatsapp_msg_confirmation TEXT,
  whatsapp_msg_reminder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

-- B. TABELA USERS (Donos, Administradores e Barbeiros)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'barber')),
  avatar_url TEXT,
  phone TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON public.users (organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (organization_id, role);

-- C. TABELA SERVICES (Catálogo de Serviços)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  duration INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_org ON public.services (organization_id);

-- D. TABELA PRODUCTS (Vitrine de Produtos & Estoque da Barbearia)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  category TEXT NOT NULL DEFAULT 'Geral',
  image_url TEXT,
  stock INT NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_org ON public.products (organization_id);

-- E. TABELA SCHEDULES (Horários Gerais do Salão e Escalas Individuais por Barbeiro)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL para horário geral do salão, ou UUID do barbeiro
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo, 1 = Segunda, ... 6 = Sábado
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '19:00:00',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_user_day UNIQUE (organization_id, user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_schedules_org_user ON public.schedules (organization_id, user_id, day_of_week);

-- F. TABELA APPOINTMENTS (Agendamentos)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  is_subscription BOOLEAN NOT NULL DEFAULT false,
  products JSONB,
  products_total NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON public.appointments (organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON public.appointments (user_id, start_time);

-- G. TABELA MEMBERSHIP_PLANS (Planos Mensais / Clube VIP)
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  cuts_per_month INT NOT NULL DEFAULT 2,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_org ON public.membership_plans (organization_id);

-- H. TABELA CUSTOMER_SUBSCRIPTIONS (Assinantes do Clube VIP)
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  cuts_used INT NOT NULL DEFAULT 0,
  cuts_total INT NOT NULL DEFAULT 2,
  renewal_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_phone ON public.customer_subscriptions (organization_id, client_phone);

-- ==============================================================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ==============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. FUNÇÕES AUXILIARES DE SEGURANÇA (ISOLAMENTO MULTI-TENANT E PERFIS)
-- ==============================================================================

-- Retorna a organização do usuário logado
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Retorna o cargo (role) do usuário logado ('owner', 'admin', 'barber')
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- ==============================================================================
-- 5. POLÍTICAS DE SEGURANÇA BLINDADAS (RLS)
-- ==============================================================================

-- A. Limpeza de políticas existentes
DROP POLICY IF EXISTS "Public Read Organizations" ON public.organizations;
DROP POLICY IF EXISTS "Public Read Services" ON public.services;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Public Read Barbers" ON public.users;
DROP POLICY IF EXISTS "Public Read Schedules" ON public.schedules;
DROP POLICY IF EXISTS "Public Create Appointment" ON public.appointments;
DROP POLICY IF EXISTS "Public Read Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public Read Plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Public Read Active Plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Public Read Subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Public Read Subscriptions Verification" ON public.customer_subscriptions;

DROP POLICY IF EXISTS "Tenant Manage Own Organization" ON public.organizations;
DROP POLICY IF EXISTS "Tenant Manage Own Team" ON public.users;
DROP POLICY IF EXISTS "Tenant Manage Own Services" ON public.services;
DROP POLICY IF EXISTS "Tenant Manage Own Products" ON public.products;
DROP POLICY IF EXISTS "Tenant Manage Own Schedules" ON public.schedules;
DROP POLICY IF EXISTS "Tenant Manage Own Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Tenant Manage Own Plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Tenant Manage Own Subscriptions" ON public.customer_subscriptions;

-- B. Políticas Públicas (Vitrine de Agendamento do Cliente - Acesso Anônimo Seguro)
CREATE POLICY "Public Read Organizations" ON public.organizations
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public Read Services" ON public.services
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "Public Read Products" ON public.products
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "Public Read Barbers" ON public.users
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "Public Read Schedules" ON public.schedules
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public Read Active Plans" ON public.membership_plans
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "Public Create Appointment" ON public.appointments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public Read Subscriptions Verification" ON public.customer_subscriptions
  FOR SELECT TO anon, authenticated USING (status = 'active');

-- C. Políticas do Dono / Administrador (Acesso Completo ao Estabelecimento)
CREATE POLICY "Tenant Manage Own Organization" ON public.organizations
  FOR ALL TO authenticated
  USING (id = public.get_auth_org_id())
  WITH CHECK (id = public.get_auth_org_id());

CREATE POLICY "Tenant Manage Own Team" ON public.users
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Tenant Manage Own Services" ON public.services
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Tenant Manage Own Products" ON public.products
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Tenant Manage Own Schedules" ON public.schedules
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Tenant Manage Own Appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Tenant Manage Own Plans" ON public.membership_plans
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Tenant Manage Own Subscriptions" ON public.customer_subscriptions
  FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

-- ==============================================================================
-- 6. FUNÇÃO PARA DECREMENTAR ESTOQUE DE PRODUTOS VIA BANCO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id UUID,
  p_quantity INT,
  p_org_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - p_quantity),
      updated_at = NOW()
  WHERE id = p_product_id AND organization_id = p_org_id;
END;
$$;

-- ==============================================================================
-- 7. TRIGGER AUTOMÁTICO: ONBOARDING DE NOVO PROPRIETÁRIO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  shop_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');
  
  -- Se o usuário for convidado como barbeiro de uma organização existente
  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
    INSERT INTO public.users (id, organization_id, email, full_name, role, phone)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'organization_id')::UUID,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Barbeiro Profissional'),
      'barber',
      NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
  END IF;

  -- Fluxo de Novo Dono da Barbearia
  shop_name := COALESCE(NEW.raw_user_meta_data->>'barber_shop_name', 'Minha Barbearia');
  base_slug := LOWER(REGEXP_REPLACE(shop_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  IF base_slug = '' THEN base_slug := 'barbearia'; END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  INSERT INTO public.organizations (name, slug, products_enabled, plans_enabled)
  VALUES (shop_name, final_slug, true, true)
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, organization_id, email, full_name, role)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Proprietário'),
    'owner'
  );

  -- Horários Padrão da Barbearia (Geral - user_id NULL)
  INSERT INTO public.schedules (organization_id, user_id, day_of_week, start_time, end_time, is_closed)
  VALUES
    (new_org_id, NULL, 0, '09:00:00', '14:00:00', true),
    (new_org_id, NULL, 1, '09:00:00', '19:00:00', false),
    (new_org_id, NULL, 2, '09:00:00', '19:00:00', false),
    (new_org_id, NULL, 3, '09:00:00', '19:00:00', false),
    (new_org_id, NULL, 4, '09:00:00', '19:00:00', false),
    (new_org_id, NULL, 5, '09:00:00', '20:00:00', false),
    (new_org_id, NULL, 6, '08:30:00', '18:00:00', false);

  -- Serviços Iniciais Padrão
  INSERT INTO public.services (organization_id, name, description, price, duration)
  VALUES
    (new_org_id, 'Corte Degradê / Social', 'Corte moderno na tesoura e máquina com lavagem.', 40.00, 30),
    (new_org_id, 'Barba Completa com Toalha Quente', 'Barboterapia relaxante com óleo e navalha descartável.', 35.00, 30),
    (new_org_id, 'Combo: Cabelo + Barba', 'Serviço completo de cabelo e barba alinhados.', 70.00, 50);

  -- Produtos Iniciais da Vitrine
  INSERT INTO public.products (organization_id, name, description, price, category, stock)
  VALUES
    (new_org_id, 'Pomada Modeladora Efeito Matte 100g', 'Fixação forte e acabamento natural sem brilho.', 35.00, 'Pomadas & Ceras', 50),
    (new_org_id, 'Óleo Hidratante para Barba 30ml', 'Fragrância amadeirada com óleo de argan.', 40.00, 'Barba & Cuidado', 30),
    (new_org_id, 'Cerveja Artesanal IPA 355ml', 'Cerveja gelada servida durante o atendimento.', 12.00, 'Bebidas', 100);

  -- Planos VIP Iniciais
  INSERT INTO public.membership_plans (organization_id, name, description, price, cuts_per_month)
  VALUES
    (new_org_id, 'Plano Silver (Quinzenal)', '2 cortes de cabelo por mês', 70.00, 2),
    (new_org_id, 'Plano Gold (Semanal VIP)', '4 cortes de cabelo por mês', 120.00, 4);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
