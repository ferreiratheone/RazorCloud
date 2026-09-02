import { supabase, isSupabaseConfigured } from './supabase/client';
import type { 
  Organization, 
  UserProfile, 
  Service, 
  Schedule, 
  Appointment, 
  TimeSlot,
  MembershipPlan,
  CustomerSubscription
} from '@/src/types/database';

const LOCAL_STORAGE_KEY_PREFIX = 'razorcloud_';

export function getLocalDateString(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setLocalData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

export const DEFAULT_SCHEDULES_FACTORY = (orgId: string): Schedule[] => [
  { id: 'sch-0-' + orgId, organization_id: orgId, day_of_week: 0, start_time: '09:00', end_time: '14:00', is_closed: true },
  { id: 'sch-1-' + orgId, organization_id: orgId, day_of_week: 1, start_time: '09:00', end_time: '19:00', is_closed: false },
  { id: 'sch-2-' + orgId, organization_id: orgId, day_of_week: 2, start_time: '09:00', end_time: '19:00', is_closed: false },
  { id: 'sch-3-' + orgId, organization_id: orgId, day_of_week: 3, start_time: '09:00', end_time: '19:00', is_closed: false },
  { id: 'sch-4-' + orgId, organization_id: orgId, day_of_week: 4, start_time: '09:00', end_time: '19:00', is_closed: false },
  { id: 'sch-5-' + orgId, organization_id: orgId, day_of_week: 5, start_time: '09:00', end_time: '20:00', is_closed: false },
  { id: 'sch-6-' + orgId, organization_id: orgId, day_of_week: 6, start_time: '08:30', end_time: '18:00', is_closed: false },
];

export const DEFAULT_PLANS_FACTORY = (orgId: string): MembershipPlan[] => [
  {
    id: 'plan-1-' + orgId,
    organization_id: orgId,
    name: 'Plano Silver (Quinzenal)',
    description: 'Ideal para quem corta o cabelo a cada 15 dias.',
    price: 70.00,
    cuts_per_month: 2,
    active: true,
  },
  {
    id: 'plan-2-' + orgId,
    organization_id: orgId,
    name: 'Plano Gold (Semanal VIP)',
    description: 'Corte toda semana para manter o visual sempre alinhado.',
    price: 120.00,
    cuts_per_month: 4,
    active: true,
  },
];

export const DataService = {
  // --- AUTENTICAÇÃO E SESSÃO MULTI-DISPOSITIVOS ---
  async getCurrentUserProfile(): Promise<{ user: UserProfile | null; organization: Organization | null }> {
    if (isSupabaseConfigured()) {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authData?.user && !authError) {
          const authUserId = authData.user.id;
          const userEmail = authData.user.email || '';
          const meta = authData.user.user_metadata || {};
          
          const userSavedOrg = getLocalData<Organization | null>('saved_org_' + authUserId, null);
          const shopName = userSavedOrg?.name || meta.barber_shop_name || 'Minha Barbearia';
          const fullName = meta.full_name || 'Proprietário';
          const baseSlug = userSavedOrg?.slug || (shopName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'barbearia') + '-' + authUserId.substring(0, 4);

          // 1. Buscar perfil do usuário no Supabase
          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUserId)
            .maybeSingle();

          if (userProfile && userProfile.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', userProfile.organization_id)
              .maybeSingle();

            if (orgData) {
              setLocalData('saved_org_' + authUserId, orgData);
              setLocalData('current_user', userProfile);
              setLocalData('current_org', orgData);
              return {
                user: userProfile as UserProfile,
                organization: orgData as Organization,
              };
            }
          }

          // 2. Se o perfil não existia no banco, provisiona no Supabase
          try {
            const { data: newOrg } = await supabase
              .from('organizations')
              .insert([{ name: shopName, slug: baseSlug }])
              .select()
              .maybeSingle();

            if (newOrg) {
              const { data: newUser } = await supabase
                .from('users')
                .upsert({
                  id: authUserId,
                  organization_id: newOrg.id,
                  email: userEmail,
                  full_name: fullName,
                  role: 'owner',
                })
                .select()
                .maybeSingle();

              if (newUser) {
                setLocalData('saved_org_' + authUserId, newOrg);
                setLocalData('current_user', newUser);
                setLocalData('current_org', newOrg);
                return {
                  user: newUser as UserProfile,
                  organization: newOrg as Organization,
                };
              }
            }
          } catch (createErr) {
            console.warn('Erro ao provisionar organização no Supabase:', createErr);
          }

          if (userSavedOrg) {
            const cachedUser: UserProfile = {
              id: authUserId,
              organization_id: userSavedOrg.id,
              email: userEmail,
              full_name: fullName,
              role: 'owner',
              active: true,
            };
            return { user: cachedUser, organization: userSavedOrg };
          }

          const fallbackOrg: Organization = {
            id: authUserId,
            name: shopName,
            slug: baseSlug,
          };
          const fallbackUser: UserProfile = {
            id: authUserId,
            organization_id: fallbackOrg.id,
            email: userEmail,
            full_name: fullName,
            role: 'owner',
            active: true,
          };
          setLocalData('saved_org_' + authUserId, fallbackOrg);
          setLocalData('current_user', fallbackUser);
          setLocalData('current_org', fallbackOrg);
          return { user: fallbackUser, organization: fallbackOrg };
        }
      } catch (err) {
        console.warn('Erro ao obter usuário do Supabase:', err);
      }
    }

    const localUser = getLocalData<UserProfile | null>('current_user', null);
    const localOrg = getLocalData<Organization | null>('current_org', null);
    return { user: localUser, organization: localOrg };
  },

  // --- ORGANIZAÇÃO (TENANT) ---
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (data && !error) {
          return data as Organization;
        }
      } catch (e) {
        console.warn('Erro ao buscar org por slug no Supabase:', e);
      }
    }

    const allOrgs = getLocalData<Record<string, Organization>>('all_orgs', {});
    if (allOrgs[slug]) return allOrgs[slug];

    const currentOrg = getLocalData<Organization | null>('current_org', null);
    if (currentOrg && currentOrg.slug === slug) return currentOrg;

    return null;
  },

  async getOrganization(orgId: string): Promise<Organization | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();
        if (data && !error) return data as Organization;
      } catch (e) {}
    }

    const currentOrg = getLocalData<Organization | null>('current_org', null);
    if (currentOrg && currentOrg.id === orgId) return currentOrg;
    return null;
  },

  async updateOrganization(org: Partial<Organization> & { id: string }): Promise<Organization> {
    const payload: any = {
      name: org.name,
      slug: org.slug,
      address: org.address,
      phone: org.phone,
      logo_url: org.logo_url,
      plans_enabled: org.plans_enabled,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUserId = authData?.user?.id;

        if (authUserId) {
          let targetOrgId = org.id;
          const { data: userProfile } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', authUserId)
            .maybeSingle();

          if (userProfile?.organization_id) {
            targetOrgId = userProfile.organization_id;
          }

          let { data: updatedOrg } = await supabase
            .from('organizations')
            .update(payload)
            .eq('id', targetOrgId)
            .select()
            .maybeSingle();

          if (!updatedOrg) {
            const { data: upsertedOrg } = await supabase
              .from('organizations')
              .upsert([{ id: targetOrgId, ...payload }])
              .select()
              .maybeSingle();
            updatedOrg = upsertedOrg;
          }

          if (updatedOrg) {
            await supabase.from('users').upsert({
              id: authUserId,
              organization_id: updatedOrg.id,
              email: authData.user.email,
              full_name: updatedOrg.name,
              role: 'owner',
            });

            setLocalData('saved_org_' + authUserId, updatedOrg);
            setLocalData('current_org', updatedOrg);

            const allOrgs = getLocalData<Record<string, Organization>>('all_orgs', {});
            allOrgs[updatedOrg.slug] = updatedOrg;
            setLocalData('all_orgs', allOrgs);

            return updatedOrg as Organization;
          }
        }
      } catch (e) {
        console.error('Erro ao atualizar no Supabase:', e);
      }
    }

    const current = getLocalData<Organization>('current_org', org as Organization);
    const merged = { ...current, ...org, ...payload };
    
    if (typeof window !== 'undefined') {
      const rawUser = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'current_user');
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          if (u?.id) setLocalData('saved_org_' + u.id, merged);
        } catch (e) {}
      }
    }

    const allOrgs = getLocalData<Record<string, Organization>>('all_orgs', {});
    if (merged.slug) allOrgs[merged.slug] = merged;
    setLocalData('all_orgs', allOrgs);
    setLocalData('current_org', merged);
    return merged;
  },

  // --- SERVIÇOS ---
  async getServices(orgId: string): Promise<Service[]> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            setLocalData('services_' + orgId, data);
            return data as Service[];
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar serviços do Supabase:', e);
      }
    }

    return getLocalData<Service[]>('services_' + orgId, []);
  },

  async createService(service: Omit<Service, 'id'>): Promise<Service> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(service.organization_id);
        if (isUuid) {
          const { data, error } = await supabase
            .from('services')
            .insert([service])
            .select()
            .single();
          if (data && !error) {
            const list = getLocalData<Service[]>('services_' + service.organization_id, []);
            setLocalData('services_' + service.organization_id, [...list, data]);
            return data as Service;
          }
        }
      } catch (e) {
        console.error('Erro ao criar serviço no Supabase:', e);
      }
    }

    const newService: Service = {
      ...service,
      id: 'srv-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const services = getLocalData<Service[]>('services_' + service.organization_id, []);
    const updated = [...services, newService];
    setLocalData('services_' + service.organization_id, updated);
    return newService;
  },

  async updateService(id: string, updates: Partial<Service>, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').update(updates).eq('id', id);
      } catch (e) {
        console.error('Erro ao atualizar serviço:', e);
      }
    }

    const services = getLocalData<Service[]>('services_' + orgId, []);
    const updated = services.map(s => s.id === id ? { ...s, ...updates } : s);
    setLocalData('services_' + orgId, updated);
  },

  async deleteService(id: string, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao deletar serviço:', e);
      }
    }

    const services = getLocalData<Service[]>('services_' + orgId, []);
    const updated = services.filter(s => s.id !== id);
    setLocalData('services_' + orgId, updated);
  },

  // --- EQUIPE / PROFISSIONAIS ---
  async getTeam(orgId: string): Promise<UserProfile[]> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            setLocalData('team_' + orgId, data);
            return data as UserProfile[];
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar equipe do Supabase:', e);
      }
    }

    return getLocalData<UserProfile[]>('team_' + orgId, []);
  },

  async createTeamMember(member: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    const newId = 'user-' + Date.now();
    const newMember: UserProfile = {
      ...member,
      id: newId,
      rating: 5.0,
      active: true,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([{ ...member, id: crypto.randomUUID?.() || newId }])
          .select()
          .single();
        if (data && !error) return data as UserProfile;
      } catch (e) {
        console.error('Erro ao cadastrar membro da equipe:', e);
      }
    }

    const team = getLocalData<UserProfile[]>('team_' + member.organization_id, []);
    const updated = [...team, newMember];
    setLocalData('team_' + member.organization_id, updated);
    return newMember;
  },

  async updateTeamMember(id: string, updates: Partial<UserProfile>, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('users').update(updates).eq('id', id);
      } catch (e) {
        console.error('Erro ao atualizar membro:', e);
      }
    }

    const team = getLocalData<UserProfile[]>('team_' + orgId, []);
    const updated = team.map(u => u.id === id ? { ...u, ...updates } : u);
    setLocalData('team_' + orgId, updated);
  },

  async deleteTeamMember(id: string, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('users').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao remover membro:', e);
      }
    }

    const team = getLocalData<UserProfile[]>('team_' + orgId, []);
    const updated = team.filter(u => u.id !== id);
    setLocalData('team_' + orgId, updated);
  },

  // --- HORÁRIOS / SCHEDULES ---
  async getSchedules(orgId: string): Promise<Schedule[]> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('organization_id', orgId)
            .order('day_of_week', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            setLocalData('schedules_' + orgId, data);
            return data as Schedule[];
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar horários no Supabase:', e);
      }
    }

    const fallback = DEFAULT_SCHEDULES_FACTORY(orgId);
    return getLocalData<Schedule[]>('schedules_' + orgId, fallback);
  },

  async saveSchedules(orgId: string, schedules: Schedule[]): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          await supabase.from('schedules').upsert(schedules);
        }
      } catch (e) {
        console.error('Erro ao salvar horários:', e);
      }
    }

    setLocalData('schedules_' + orgId, schedules);
  },

  // --- AGENDAMENTOS (APPOINTMENTS) ---
  async getAppointments(orgId: string, dateStr?: string): Promise<Appointment[]> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('appointments')
            .select('*, service:services(*), barber:users(*)')
            .eq('organization_id', orgId)
            .order('start_time', { ascending: true });

          if (!error && Array.isArray(data)) {
            setLocalData('appointments_' + orgId, data);
            if (!dateStr) return data as Appointment[];
            return (data as Appointment[]).filter(a => getLocalDateString(a.start_time) === dateStr);
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar agendamentos do Supabase:', e);
      }
    }

    const list = getLocalData<Appointment[]>('appointments_' + orgId, []);
    if (!dateStr) return list;

    return list.filter(a => getLocalDateString(a.start_time) === dateStr);
  },

  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const newApt: Appointment = {
      ...appointment,
      id: 'apt-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        let payload: any = {
          organization_id: appointment.organization_id,
          service_id: appointment.service_id,
          user_id: appointment.user_id,
          client_name: appointment.client_name,
          client_phone: appointment.client_phone,
          client_email: appointment.client_email,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status || 'confirmed',
          price: Number(appointment.price) || 0,
          is_subscription: Boolean(appointment.is_subscription),
        };

        const isOrgUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.organization_id);

        if (isOrgUuid) {
          // 1. Validar / Resolver user_id para um UUID real no Supabase
          const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.user_id);
          if (!isUserUuid) {
            const { data: users } = await supabase
              .from('users')
              .select('id')
              .eq('organization_id', payload.organization_id)
              .limit(1);

            if (users && users.length > 0) {
              payload.user_id = users[0].id;
            } else {
              const { data: anyUser } = await supabase.from('users').select('id').limit(1);
              if (anyUser && anyUser.length > 0) {
                payload.user_id = anyUser[0].id;
              }
            }
          }

          // 2. Validar / Resolver service_id para um UUID real no Supabase
          const isServiceUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.service_id);
          if (!isServiceUuid) {
            const { data: services } = await supabase
              .from('services')
              .select('id')
              .eq('organization_id', payload.organization_id)
              .limit(1);

            if (services && services.length > 0) {
              payload.service_id = services[0].id;
            } else {
              const { data: newSrv } = await supabase
                .from('services')
                .insert([{
                  organization_id: payload.organization_id,
                  name: 'Atendimento Barbearia',
                  price: payload.price,
                  duration: 30,
                  active: true
                }])
                .select()
                .maybeSingle();

              if (newSrv) {
                payload.service_id = newSrv.id;
              }
            }
          }

          // 3. Inserir no Supabase com resiliência de schema
          let { data, error } = await supabase
            .from('appointments')
            .insert([payload])
            .select('*, service:services(*), barber:users(*)')
            .single();

          if (error && error.message?.includes('is_subscription')) {
            delete payload.is_subscription;
            const retry = await supabase
              .from('appointments')
              .insert([payload])
              .select('*, service:services(*), barber:users(*)')
              .single();
            data = retry.data;
            error = retry.error;
          }

          if (data && !error) {
            const list = getLocalData<Appointment[]>('appointments_' + appointment.organization_id, []);
            setLocalData('appointments_' + appointment.organization_id, [data, ...list]);
            return data as Appointment;
          } else {
            console.error('Erro detalhado ao gravar agendamento no Supabase:', error);
          }
        }
      } catch (e) {
        console.error('Erro ao registrar agendamento no Supabase:', e);
      }
    }

    const list = getLocalData<Appointment[]>('appointments_' + appointment.organization_id, []);
    const updated = [newApt, ...list];
    setLocalData('appointments_' + appointment.organization_id, updated);
    return newApt;
  },

  async updateAppointmentStatus(id: string, status: Appointment['status'], orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('appointments').update({ status }).eq('id', id);
      } catch (e) {
        console.error('Erro ao atualizar status do agendamento:', e);
      }
    }

    const list = getLocalData<Appointment[]>('appointments_' + orgId, []);
    const updated = list.map(a => a.id === id ? { ...a, status } : a);
    setLocalData('appointments_' + orgId, updated);
  },

  async deleteAppointment(id: string, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('appointments').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao excluir agendamento do Supabase:', e);
      }
    }

    const list = getLocalData<Appointment[]>('appointments_' + orgId, []);
    const updated = list.filter(a => a.id !== id);
    setLocalData('appointments_' + orgId, updated);
  },

  // --- PLANOS MENSAIS E ASSINATURAS (CLUBE VIP) ---
  async getPlans(orgId: string): Promise<MembershipPlan[]> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('membership_plans')
            .select('*')
            .eq('organization_id', orgId)
            .order('price', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            setLocalData('plans_' + orgId, data);
            return data as MembershipPlan[];
          }
        }
      } catch (e) {}
    }

    const fallback = DEFAULT_PLANS_FACTORY(orgId);
    return getLocalData<MembershipPlan[]>('plans_' + orgId, fallback);
  },

  async createPlan(plan: Omit<MembershipPlan, 'id'>): Promise<MembershipPlan> {
    const newPlan: MembershipPlan = {
      ...plan,
      id: 'plan-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('membership_plans')
          .insert([plan])
          .select()
          .single();
        if (data && !error) {
          const list = await this.getPlans(plan.organization_id);
          setLocalData('plans_' + plan.organization_id, [...list, data]);
          return data as MembershipPlan;
        }
      } catch (e) {}
    }

    const list = getLocalData<MembershipPlan[]>('plans_' + plan.organization_id, DEFAULT_PLANS_FACTORY(plan.organization_id));
    const updated = [...list, newPlan];
    setLocalData('plans_' + plan.organization_id, updated);
    return newPlan;
  },

  async updatePlan(id: string, updates: Partial<MembershipPlan>, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('membership_plans').update(updates).eq('id', id);
      } catch (e) {}
    }

    const list = getLocalData<MembershipPlan[]>('plans_' + orgId, DEFAULT_PLANS_FACTORY(orgId));
    const updated = list.map(p => p.id === id ? { ...p, ...updates } : p);
    setLocalData('plans_' + orgId, updated);
  },

  async deletePlan(id: string, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('membership_plans').delete().eq('id', id);
      } catch (e) {}
    }

    const list = getLocalData<MembershipPlan[]>('plans_' + orgId, DEFAULT_PLANS_FACTORY(orgId));
    const updated = list.filter(p => p.id !== id);
    setLocalData('plans_' + orgId, updated);
  },

  async getSubscriptions(orgId: string): Promise<CustomerSubscription[]> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('customer_subscriptions')
            .select('*, plan:membership_plans(*)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            setLocalData('subscriptions_' + orgId, data);
            return data as CustomerSubscription[];
          }
        }
      } catch (e) {}
    }

    return getLocalData<CustomerSubscription[]>('subscriptions_' + orgId, []);
  },

  async createSubscription(sub: Omit<CustomerSubscription, 'id'>): Promise<CustomerSubscription> {
    const newSub: CustomerSubscription = {
      ...sub,
      id: 'sub-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('customer_subscriptions')
          .insert([sub])
          .select('*, plan:membership_plans(*)')
          .single();
        if (data && !error) {
          const list = getLocalData<CustomerSubscription[]>('subscriptions_' + sub.organization_id, []);
          setLocalData('subscriptions_' + sub.organization_id, [data, ...list]);
          return data as CustomerSubscription;
        }
      } catch (e) {}
    }

    const list = getLocalData<CustomerSubscription[]>('subscriptions_' + sub.organization_id, []);
    const updated = [newSub, ...list];
    setLocalData('subscriptions_' + sub.organization_id, updated);
    return newSub;
  },

  async updateSubscription(id: string, updates: Partial<CustomerSubscription>, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customer_subscriptions').update(updates).eq('id', id);
      } catch (e) {}
    }

    const list = getLocalData<CustomerSubscription[]>('subscriptions_' + orgId, []);
    const updated = list.map(s => s.id === id ? { ...s, ...updates } : s);
    setLocalData('subscriptions_' + orgId, updated);
  },

  async deleteSubscription(id: string, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customer_subscriptions').delete().eq('id', id);
      } catch (e) {}
    }

    const list = getLocalData<CustomerSubscription[]>('subscriptions_' + orgId, []);
    const updated = list.filter(s => s.id !== id);
    setLocalData('subscriptions_' + orgId, updated);
  },

  async checkClientSubscription(orgId: string, phone: string): Promise<CustomerSubscription | null> {
    const cleanInputPhone = phone.replace(/\D/g, '');
    if (!cleanInputPhone) return null;

    const subs = await this.getSubscriptions(orgId);
    const plans = await this.getPlans(orgId);

    const activeSub = subs.find(s => {
      const cleanSubPhone = s.client_phone.replace(/\D/g, '');
      return (
        s.status === 'active' &&
        (cleanSubPhone.includes(cleanInputPhone) || cleanInputPhone.includes(cleanSubPhone))
      );
    });

    if (activeSub) {
      const plan = plans.find(p => p.id === activeSub.plan_id);
      return { ...activeSub, plan };
    }

    return null;
  },

  async useSubscriptionCut(subscriptionId: string, orgId: string): Promise<void> {
    const list = await this.getSubscriptions(orgId);
    const sub = list.find(s => s.id === subscriptionId);
    if (sub) {
      const newUsed = sub.cuts_used + 1;
      await this.updateSubscription(subscriptionId, { cuts_used: newUsed }, orgId);
    }
  },

  // --- MOTOR DE CÁLCULO DE SLOTS DISPONÍVEIS ---
  async getAvailableSlots(params: {
    orgId: string;
    barberId?: string;
    serviceDuration: number;
    targetDate: Date;
  }): Promise<TimeSlot[]> {
    const { orgId, barberId, serviceDuration, targetDate } = params;
    const dayOfWeek = targetDate.getDay();

    const schedules = await this.getSchedules(orgId);
    const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);

    if (!daySchedule || daySchedule.is_closed) {
      return [];
    }

    const [startHour, startMin] = daySchedule.start_time.split(':').map(Number);
    const [endHour, endMin] = daySchedule.end_time.split(':').map(Number);

    const dateKey = getLocalDateString(targetDate);
    const appointments = await this.getAppointments(orgId, dateKey);
    const team = await this.getTeam(orgId);
    const totalBarberCount = Math.max(1, team.filter(t => t.active !== false).length);

    const isSpecificBarber = barberId && barberId !== 'any';

    const slots: TimeSlot[] = [];
    const intervalMinutes = 30;

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const now = new Date();
    const isToday = getLocalDateString(targetDate) === getLocalDateString(now);
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

    while (currentMinutes + serviceDuration <= endMinutes) {
      const slotHour = Math.floor(currentMinutes / 60);
      const slotMinute = currentMinutes % 60;
      const timeString = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;

      const slotStart = new Date(targetDate);
      slotStart.setHours(slotHour, slotMinute, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60 * 1000);

      let available = true;
      if (isToday && currentMinutes <= currentMinutesNow + 15) {
        available = false;
      }

      if (available) {
        if (isSpecificBarber) {
          // Barbeiro específico: verificar se esse barbeiro está ocupado
          for (const apt of appointments) {
            if (apt.status === 'cancelled') continue;
            if (apt.user_id !== barberId) continue;

            const aptStart = new Date(apt.start_time).getTime();
            const aptEnd = new Date(apt.end_time).getTime();
            const candidateStart = slotStart.getTime();
            const candidateEnd = slotEnd.getTime();

            if (candidateStart < aptEnd && candidateEnd > aptStart) {
              available = false;
              break;
            }
          }
        } else {
          // "Qualquer profissional": slot só fica indisponível se TODOS os barbeiros estiverem ocupados
          const busyBarbers = new Set<string>();
          for (const apt of appointments) {
            if (apt.status === 'cancelled') continue;

            const aptStart = new Date(apt.start_time).getTime();
            const aptEnd = new Date(apt.end_time).getTime();
            const candidateStart = slotStart.getTime();
            const candidateEnd = slotEnd.getTime();

            if (candidateStart < aptEnd && candidateEnd > aptStart) {
              busyBarbers.add(apt.user_id);
            }
          }

          if (busyBarbers.size >= totalBarberCount) {
            available = false;
          }
        }
      }

      slots.push({
        time: timeString,
        available,
        isoString: slotStart.toISOString(),
      });

      currentMinutes += intervalMinutes;
    }

    return slots;
  }
};
