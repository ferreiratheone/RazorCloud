-- ==============================================================================
-- SCHEMA DDL: RazorCloud Multi-Tenant SaaS (Barbearias)
-- ==============================================================================

-- Habilita UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA ORGANIZATIONS (Inquilinos / Barbearias)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index para busca ultra-rápida por slug na vitrine pública
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

-- 2. TABELA USERS (Perfis de Usuários / Donos e Barbeiros)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_users_org ON public.users (organization_id);

-- 3. TABELA SERVICES (Serviços e Preços)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  duration INT NOT NULL DEFAULT 30, -- Em minutos
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_org ON public.services (organization_id);

-- 4. TABELA SCHEDULES (Jornada de Trabalho / Horários de Funcionamento)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL significa regra global da barbearia
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Segunda, ..., 6=Sábado
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '19:00:00',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_user_day UNIQUE (organization_id, user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_schedules_org ON public.schedules (organization_id);

-- 5. TABELA APPOINTMENTS (Agendamentos)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT, -- Barbeiro
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON public.appointments (organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON public.appointments (user_id, start_time);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS:

-- 1. Vitrine Pública (Pode ler dados ativos por slug / organization_id)
CREATE POLICY "Public Read Organizations" ON public.organizations
  FOR SELECT USING (true);

CREATE POLICY "Public Read Services" ON public.services
  FOR SELECT USING (active = true);

CREATE POLICY "Public Read Barbers" ON public.users
  FOR SELECT USING (active = true);

CREATE POLICY "Public Read Schedules" ON public.schedules
  FOR SELECT USING (true);

CREATE POLICY "Public Create Appointment" ON public.appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Existing Times for Slot Calculation" ON public.appointments
  FOR SELECT USING (status != 'cancelled');

-- 2. Painel Privado (Membros autenticados acessam apenas sua organization)
CREATE POLICY "Members Read/Write Org" ON public.organizations
  FOR ALL USING (
    id IN (SELECT organization_id FROM public.users WHERE users.id = auth.uid())
  );

CREATE POLICY "Members Read/Write Users" ON public.users
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE users.id = auth.uid())
  );

CREATE POLICY "Members Read/Write Services" ON public.services
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE users.id = auth.uid())
  );

CREATE POLICY "Members Read/Write Schedules" ON public.schedules
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE users.id = auth.uid())
  );

CREATE POLICY "Members Read/Write Appointments" ON public.appointments
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE users.id = auth.uid())
  );
