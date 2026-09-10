-- ==============================================================================
-- SCRIPT SQL ÚNICO, DEFINITIVO & COMPLETO: RazorCloud SaaS Multi-Tenant
-- Como usar:
-- 1. Abra o painel do seu Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral, clique em "SQL Editor"
-- 3. Crie uma nova query (ou limpe a tela), cole TODO este código abaixo e clique em "RUN"
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABELAS PRINCIPAIS DO SISTEMA
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

-- Compatibilidade caso a tabela organizations já existisse sem as novas colunas
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS plans_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS products_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS whatsapp_auto_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS whatsapp_api_instance TEXT;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS whatsapp_reminder_hours INT NOT NULL DEFAULT 2;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS whatsapp_msg_confirmation TEXT;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS whatsapp_msg_reminder TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

-- B. TABELA USERS (Donos, Administradores e Barbeiros)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'barber' CHECK (role IN ('owner', 'admin', 'barber')),
  avatar_url TEXT,
  phone TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibilidade caso a tabela já existisse com chave estrangeira restritiva
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_org ON public.users (organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (organization_id, role);

-- C. TABELA SERVICES (Catálogo de Serviços da Barbearia)
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

-- Compatibilidade caso a tabela services já existisse sem as colunas de categorias e promoções
ALTER TABLE IF EXISTS public.services ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Cabelo';
ALTER TABLE IF EXISTS public.services ADD COLUMN IF NOT EXISTS is_promotional BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS public.services ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10,2);
ALTER TABLE IF EXISTS public.services ADD COLUMN IF NOT EXISTS promo_days TEXT;

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

-- E. TABELA SCHEDULES (Horários Gerais e Escalas Individuais por Barbeiro)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL para horário geral do salão, ou UUID do barbeiro
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo, 1 = Segunda, ... 6 = Sábado
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '19:00:00',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  has_break BOOLEAN NOT NULL DEFAULT false,
  break_start TIME DEFAULT '12:00:00',
  break_end TIME DEFAULT '13:00:00',
  slot_interval INT NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_user_day UNIQUE (organization_id, user_id, day_of_week)
);

-- Compatibilidade caso a tabela schedules já existisse sem as colunas de pausa
ALTER TABLE IF EXISTS public.schedules ADD COLUMN IF NOT EXISTS has_break BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.schedules ADD COLUMN IF NOT EXISTS break_start TIME DEFAULT '12:00:00';
ALTER TABLE IF EXISTS public.schedules ADD COLUMN IF NOT EXISTS break_end TIME DEFAULT '13:00:00';
ALTER TABLE IF EXISTS public.schedules ADD COLUMN IF NOT EXISTS slot_interval INT DEFAULT 60;

CREATE INDEX IF NOT EXISTS idx_schedules_org_user ON public.schedules (organization_id, user_id, day_of_week);

-- F. TABELA APPOINTMENTS (Agendamentos do Salão)
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

-- Compatibilidade caso a tabela appointments já existisse sem as colunas de planos e produtos
ALTER TABLE IF EXISTS public.appointments ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS public.appointments ADD COLUMN IF NOT EXISTS products JSONB;
ALTER TABLE IF EXISTS public.appointments ADD COLUMN IF NOT EXISTS products_total NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.appointments ADD COLUMN IF NOT EXISTS additional_services JSONB;

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

-- Retorna a organização do usuário autenticado no Supabase
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1;
$$;

-- Retorna o cargo (role) do usuário autenticado ('owner', 'admin', 'barber')
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1;
$$;

-- ==============================================================================
-- 5. POLÍTICAS DE SEGURANÇA BLINDADAS (RLS)
-- ==============================================================================

-- Limpeza de políticas existentes para re-execução limpa
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

-- A. Políticas Públicas (Vitrine de Agendamento do Cliente - Acesso Anônimo Seguro)
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

CREATE POLICY "Public Read Appointments" ON public.appointments
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public Create Appointment" ON public.appointments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public Read Subscriptions Verification" ON public.customer_subscriptions
  FOR SELECT TO anon, authenticated USING (status = 'active');

-- B. Políticas do Dono / Administrador (Acesso e Gestão Total do Estabelecimento)
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
-- 6. FUNÇÃO RPC PARA BAIXA AUTOMÁTICA DE ESTOQUE
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
-- 7. TRIGGER AUTOMÁTICO: CRIAÇÃO DE BARBEARIA E ONBOARDING DO DONO
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
  INSERT INTO public.schedules (organization_id, user_id, day_of_week, start_time, end_time, is_closed, has_break, break_start, break_end, slot_interval)
  VALUES
    (new_org_id, NULL, 0, '09:00:00', '14:00:00', true, false, '12:00:00', '13:00:00', 60),
    (new_org_id, NULL, 1, '09:00:00', '19:00:00', false, false, '12:00:00', '13:00:00', 60),
    (new_org_id, NULL, 2, '09:00:00', '19:00:00', false, false, '12:00:00', '13:00:00', 60),
    (new_org_id, NULL, 3, '09:00:00', '19:00:00', false, false, '12:00:00', '13:00:00', 60),
    (new_org_id, NULL, 4, '09:00:00', '19:00:00', false, false, '12:00:00', '13:00:00', 60),
    (new_org_id, NULL, 5, '09:00:00', '20:00:00', false, false, '12:00:00', '13:00:00', 60),
    (new_org_id, NULL, 6, '08:30:00', '18:00:00', false, false, '12:00:00', '13:00:00', 60);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. FUNÇÃO RPC PARA DEFINIR / ALTERAR SENHA DO BARBEIRO PELO DONO
-- ==============================================================================

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

  -- 4. Se o barbeiro já tem auth_user_id vinculado
  IF v_auth_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_auth_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Senha atualizada com sucesso.');
  END IF;

  -- 5. Se tiver e-mail mas auth_user_id ainda não foi preenchido na public.users
  IF v_user_email IS NOT NULL THEN
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

      RETURN jsonb_build_object('success', true, 'message', 'Senha atualizada e usuário vinculado com sucesso.');
    END IF;
  END IF;

  -- Se o usuário ainda não existe em auth.users, sinalizar para criar via signUp
  RETURN jsonb_build_object('success', true, 'needs_signup', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_barber_password(UUID, TEXT) TO authenticated, anon;

-- ==============================================================================
-- 9. CONFIRMAÇÃO AUTOMÁTICA DE E-MAILS (DISPENSA VERIFICAÇÃO DE CAIXA DE ENTRADA)
-- ==============================================================================

-- Liberar login imediato para todas as contas criadas até o momento
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Vincular auth_user_id nos registros da public.users que compartilham o mesmo e-mail
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(a.email))
  AND u.auth_user_id IS NULL;
