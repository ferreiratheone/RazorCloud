export type Role = 'owner' | 'barber' | 'admin';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  plans_enabled?: boolean;
  products_enabled?: boolean;
  whatsapp_auto_enabled?: boolean;
  whatsapp_api_url?: string;
  whatsapp_api_instance?: string;
  whatsapp_api_token?: string;
  whatsapp_reminder_hours?: number;
  whatsapp_msg_confirmation?: string;
  whatsapp_msg_reminder?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  email?: string;
  full_name: string;
  role: Role;
  avatar_url?: string;
  rating?: number;
  phone?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // in minutes
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

// --- PRODUTOS E ITENS ADICIONAIS DA BARBEARIA ---
export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  price: number;
  category: string; // "Pomadas & Ceras", "Bebidas", "Acessórios", "Vestuário", "Geral"
  image_url?: string;
  stock?: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentProductItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Schedule {
  id: string;
  organization_id: string;
  user_id?: string | null; // specific barber or general shop schedule
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // "09:00"
  end_time: string; // "19:00"
  is_closed: boolean;
  has_break?: boolean;
  break_start?: string; // "12:00"
  break_end?: string; // "13:00"
  slot_interval?: number; // 60
  created_at?: string;
}

export interface Appointment {
  id: string;
  organization_id: string;
  service_id: string;
  user_id: string; // Barber ID
  client_name: string;
  client_phone: string;
  client_email?: string;
  start_time: string; // ISO string e.g. "2026-11-12T14:00:00Z"
  end_time: string; // ISO string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  notes?: string;
  is_subscription?: boolean;
  products?: AppointmentProductItem[];
  products_total?: number;
  created_at?: string;
  updated_at?: string;
  // Joins
  service?: Service;
  barber?: UserProfile;
}

export interface TimeSlot {
  time: string; // "14:00"
  available: boolean;
  isoString: string;
}

// --- PLANOS MENSAIS E ASSINATURAS (CLUBE VIP) ---
export interface MembershipPlan {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  price: number;
  cuts_per_month: number; // Ex: 2, 4, ou 999 para ilimitado
  active: boolean;
  created_at?: string;
}

export interface CustomerSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  client_name: string;
  client_phone: string;
  cuts_used: number;
  cuts_total: number;
  renewal_date: string; // "YYYY-MM-DD"
  status: 'active' | 'expired' | 'cancelled';
  created_at?: string;
  // Join
  plan?: MembershipPlan;
}

// --- RELATÓRIOS E MÉTRICAS FINANCEIRAS ---
export interface FinancialMetrics {
  totalRevenue: number;
  servicesRevenue: number;
  productsRevenue: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  averageTicket: number;
  topServices: {
    name: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  topProducts: {
    name: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  barberPerformance: {
    barberId: string;
    barberName: string;
    avatarUrl?: string;
    cutsCount: number;
    revenue: number;
    percentage: number;
  }[];
  dailyRevenue: {
    date: string;
    dayLabel: string;
    revenue: number;
    appointmentsCount: number;
  }[];
}
