import { createClient } from './supabase/client';
import type { 
  Organization, 
  UserProfile, 
  Service, 
  Schedule, 
  Appointment, 
  TimeSlot 
} from '@/src/types/database';

const supabase = createClient();

const LOCAL_STORAGE_KEY_PREFIX = 'razorcloud_';

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

// Initial sample seed if database is empty or user is testing manually
const DEFAULT_ORG: Organization = {
  id: 'org-demo-123',
  name: 'RazorCloud Barber Studio',
  slug: 'minha-barbearia',
  address: 'Avenida Paulista, 1500 - São Paulo, SP',
  phone: '(11) 98765-4321',
};

const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-demo-1',
    organization_id: 'org-demo-123',
    full_name: 'Alexandre Silva',
    role: 'owner',
    email: 'alexandre@razorcloud.app',
    rating: 4.9,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '(11) 98888-1111',
    active: true,
  },
  {
    id: 'user-demo-2',
    organization_id: 'org-demo-123',
    full_name: 'Bruno Machado',
    role: 'barber',
    email: 'bruno@razorcloud.app',
    rating: 4.8,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '(11) 97777-2222',
    active: true,
  },
  {
    id: 'user-demo-3',
    organization_id: 'org-demo-123',
    full_name: 'Carlos Santana',
    role: 'barber',
    email: 'carlos@razorcloud.app',
    rating: 5.0,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '(11) 96666-3333',
    active: true,
  },
];

const DEFAULT_SERVICES: Service[] = [
  {
    id: 'srv-1',
    organization_id: 'org-demo-123',
    name: 'Corte Clássico & Degradê',
    description: 'Corte na tesoura ou máquina, com lavagem refrescante e finalização com pomada premium.',
    price: 65.00,
    duration: 45,
    active: true,
  },
  {
    id: 'srv-2',
    organization_id: 'org-demo-123',
    name: 'Barboterapia Tradicional',
    description: 'Design de barba com toalha quente, vapor de ozônio, navalhete e óleo hidratante exclusivo.',
    price: 45.00,
    duration: 30,
    active: true,
  },
  {
    id: 'srv-3',
    organization_id: 'org-demo-123',
    name: 'Combo Completo (Corte + Barba)',
    description: 'O pacote completo para transformar o visual. Inclui sobrancelha e hidratação.',
    price: 100.00,
    duration: 75,
    active: true,
  },
  {
    id: 'srv-4',
    organization_id: 'org-demo-123',
    name: 'Acabamento & Pezinho',
    description: 'Alinhamento preciso de perfil, costeleta e nuca com navalha.',
    price: 25.00,
    duration: 15,
    active: true,
  },
];

const DEFAULT_SCHEDULES: Schedule[] = [
  { id: 'sch-0', organization_id: 'org-demo-123', day_of_week: 0, start_time: '09:00', end_time: '14:00', is_closed: true },
  { id: 'sch-1', organization_id: 'org-demo-123', day_of_week: 1, start_time: '09:00', end_time: '19:00', is_closed: false },
  { id: 'sch-2', organization_id: 'org-demo-123', day_of_week: 2, start_time: '09:00', end_time: '19:00', is_closed: false },
  { id: 'sch-3', organization_id: 'org-demo-123', day_of_week: 3, start_time: '09:00', end_time: '19:00', is_closed: false },
  { id: 'sch-4', organization_id: 'org-demo-123', day_of_week: 4, start_time: '09:00', end_time: '19:00', is_closed: false },
  { id: 'sch-5', organization_id: 'org-demo-123', day_of_week: 5, start_time: '09:00', end_time: '20:00', is_closed: false },
  { id: 'sch-6', organization_id: 'org-demo-123', day_of_week: 6, start_time: '08:30', end_time: '18:00', is_closed: false },
];

export const DataService = {
  // --- ORGANIZAÇÃO (TENANT) ---
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single();

      if (data && !error) return data as Organization;
    } catch (e) {
      // fallback
    }

    const org = getLocalData<Organization>('org', DEFAULT_ORG);
    return org.slug === slug || slug === 'minha-barbearia' || slug === 'demo' ? org : org;
  },

  async getOrganization(orgId: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (data && !error) return data as Organization;
    } catch (e) {}

    return getLocalData<Organization>('org', DEFAULT_ORG);
  },

  async updateOrganization(org: Partial<Organization> & { id: string }): Promise<Organization> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(org)
        .eq('id', org.id)
        .select()
        .single();
      if (data && !error) {
        setLocalData('org', data);
        return data as Organization;
      }
    } catch (e) {}

    const current = getLocalData<Organization>('org', DEFAULT_ORG);
    const updated = { ...current, ...org };
    setLocalData('org', updated);
    return updated;
  },

  // --- SERVIÇOS ---
  async getServices(orgId: string): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (data && !error && data.length > 0) return data as Service[];
    } catch (e) {}

    return getLocalData<Service[]>('services', DEFAULT_SERVICES);
  },

  async createService(service: Omit<Service, 'id'>): Promise<Service> {
    const newService: Service = {
      ...service,
      id: 'srv-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('services')
        .insert([service])
        .select()
        .single();
      if (data && !error) {
        return data as Service;
      }
    } catch (e) {}

    const services = getLocalData<Service[]>('services', DEFAULT_SERVICES);
    const updated = [...services, newService];
    setLocalData('services', updated);
    return newService;
  },

  async updateService(id: string, updates: Partial<Service>): Promise<void> {
    try {
      await supabase.from('services').update(updates).eq('id', id);
    } catch (e) {}

    const services = getLocalData<Service[]>('services', DEFAULT_SERVICES);
    const updated = services.map(s => s.id === id ? { ...s, ...updates } : s);
    setLocalData('services', updated);
  },

  async deleteService(id: string): Promise<void> {
    try {
      await supabase.from('services').delete().eq('id', id);
    } catch (e) {}

    const services = getLocalData<Service[]>('services', DEFAULT_SERVICES);
    const updated = services.filter(s => s.id !== id);
    setLocalData('services', updated);
  },

  // --- EQUIPE / BARBEIROS ---
  async getTeam(orgId: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (data && !error && data.length > 0) return data as UserProfile[];
    } catch (e) {}

    return getLocalData<UserProfile[]>('team', DEFAULT_USERS);
  },

  async createTeamMember(member: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    const newMember: UserProfile = {
      ...member,
      id: 'user-' + Date.now(),
      rating: 5.0,
      active: true,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([member])
        .select()
        .single();
      if (data && !error) return data as UserProfile;
    } catch (e) {}

    const team = getLocalData<UserProfile[]>('team', DEFAULT_USERS);
    const updated = [...team, newMember];
    setLocalData('team', updated);
    return newMember;
  },

  async updateTeamMember(id: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await supabase.from('users').update(updates).eq('id', id);
    } catch (e) {}

    const team = getLocalData<UserProfile[]>('team', DEFAULT_USERS);
    const updated = team.map(u => u.id === id ? { ...u, ...updates } : u);
    setLocalData('team', updated);
  },

  async deleteTeamMember(id: string): Promise<void> {
    try {
      await supabase.from('users').delete().eq('id', id);
    } catch (e) {}

    const team = getLocalData<UserProfile[]>('team', DEFAULT_USERS);
    const updated = team.filter(u => u.id !== id);
    setLocalData('team', updated);
  },

  // --- HORÁRIOS / SCHEDULES ---
  async getSchedules(orgId: string): Promise<Schedule[]> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('organization_id', orgId)
        .order('day_of_week', { ascending: true });
      if (data && !error && data.length > 0) return data as Schedule[];
    } catch (e) {}

    return getLocalData<Schedule[]>('schedules', DEFAULT_SCHEDULES);
  },

  async saveSchedules(orgId: string, schedules: Schedule[]): Promise<void> {
    try {
      await supabase.from('schedules').upsert(schedules);
    } catch (e) {}

    setLocalData('schedules', schedules);
  },

  // --- AGENDAMENTOS (APPOINTMENTS) ---
  async getAppointments(orgId: string, dateStr?: string): Promise<Appointment[]> {
    try {
      let query = supabase
        .from('appointments')
        .select('*, service:services(*), barber:users(*)')
        .eq('organization_id', orgId)
        .order('start_time', { ascending: true });

      if (dateStr) {
        const startOfDay = `${dateStr}T00:00:00`;
        const endOfDay = `${dateStr}T23:59:59`;
        query = query.gte('start_time', startOfDay).lte('start_time', endOfDay);
      }

      const { data, error } = await query;
      if (data && !error && data.length > 0) return data as Appointment[];
    } catch (e) {}

    const localList = getLocalData<Appointment[]>('appointments', [
      {
        id: 'apt-1',
        organization_id: orgId,
        service_id: 'srv-1',
        user_id: 'user-demo-1',
        client_name: 'Lucas Mendes',
        client_phone: '(11) 99123-4567',
        start_time: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
        end_time: new Date(new Date().setHours(10, 45, 0, 0)).toISOString(),
        status: 'confirmed',
        price: 65.0,
      },
      {
        id: 'apt-2',
        organization_id: orgId,
        service_id: 'srv-3',
        user_id: 'user-demo-2',
        client_name: 'Guilherme Rocha',
        client_phone: '(11) 98234-5678',
        start_time: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
        end_time: new Date(new Date().setHours(15, 15, 0, 0)).toISOString(),
        status: 'confirmed',
        price: 100.0,
      },
      {
        id: 'apt-3',
        organization_id: orgId,
        service_id: 'srv-2',
        user_id: 'user-demo-1',
        client_name: 'Rodrigo Alves',
        client_phone: '(11) 97345-6789',
        start_time: new Date(new Date().setHours(16, 30, 0, 0)).toISOString(),
        end_time: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
        status: 'confirmed',
        price: 45.0,
      },
    ]);

    return localList;
  },

  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const newApt: Appointment = {
      ...appointment,
      id: 'apt-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointment])
        .select()
        .single();
      if (data && !error) return data as Appointment;
    } catch (e) {}

    const list = getLocalData<Appointment[]>('appointments', []);
    const updated = [newApt, ...list];
    setLocalData('appointments', updated);
    return newApt;
  },

  async updateAppointmentStatus(id: string, status: Appointment['status']): Promise<void> {
    try {
      await supabase.from('appointments').update({ status }).eq('id', id);
    } catch (e) {}

    const list = getLocalData<Appointment[]>('appointments', []);
    const updated = list.map(a => a.id === id ? { ...a, status } : a);
    setLocalData('appointments', updated);
  },

  // --- MOTOR DE CÁLCULO DE SLOTS DISPONÍVEIS ---
  async getAvailableSlots(params: {
    orgId: string;
    barberId?: string;
    serviceDuration: number;
    targetDate: Date;
  }): Promise<TimeSlot[]> {
    const { orgId, barberId, serviceDuration, targetDate } = params;
    const dayOfWeek = targetDate.getDay(); // 0-6

    // 1. Obter a regra de horário para o dia
    const schedules = await this.getSchedules(orgId);
    const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);

    if (!daySchedule || daySchedule.is_closed) {
      return [];
    }

    const [startHour, startMin] = daySchedule.start_time.split(':').map(Number);
    const [endHour, endMin] = daySchedule.end_time.split(':').map(Number);

    // 2. Buscar agendamentos existentes no dia
    const dateKey = targetDate.toISOString().split('T')[0];
    const appointments = await this.getAppointments(orgId, dateKey);
    
    // Filtrar apenas agendamentos ativos e se especificado, do barbeiro escolhido
    const activeAppointments = appointments.filter(a => {
      if (a.status === 'cancelled') return false;
      if (barberId && a.user_id !== barberId) return false;
      return true;
    });

    const slots: TimeSlot[] = [];
    const intervalMinutes = 30; // Intervalo de 30 minutos entre slots

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const now = new Date();
    const isToday = targetDate.toDateString() === now.toDateString();
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

    while (currentMinutes + serviceDuration <= endMinutes) {
      const slotHour = Math.floor(currentMinutes / 60);
      const slotMinute = currentMinutes % 60;
      const timeString = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;

      // Slot date range
      const slotStart = new Date(targetDate);
      slotStart.setHours(slotHour, slotMinute, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60 * 1000);

      // Verificar se o horário já passou hoje
      let available = true;
      if (isToday && currentMinutes <= currentMinutesNow + 15) {
        available = false;
      }

      // Verificar colisão com agendamentos existentes
      if (available) {
        for (const apt of activeAppointments) {
          const aptStart = new Date(apt.start_time).getTime();
          const aptEnd = new Date(apt.end_time).getTime();
          const candidateStart = slotStart.getTime();
          const candidateEnd = slotEnd.getTime();

          // Colisão se houver sobreposição de intervalos: candidateStart < aptEnd && candidateEnd > aptStart
          if (candidateStart < aptEnd && candidateEnd > aptStart) {
            available = false;
            break;
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
