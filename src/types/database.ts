export type Role = 'owner' | 'barber' | 'admin';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  plans_enabled?: boolean;
  created_at?: string;
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
}

export interface Schedule {
  id: string;
  organization_id: string;
  user_id?: string | null; // specific barber or general shop schedule
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // "09:00"
  end_time: string; // "18:00"
  is_closed: boolean;
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
  created_at?: string;
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
