import { supabase, isSupabaseConfigured, createIsolatedClient } from './supabase/client';
import { getNormalizedCategory } from './categories';
import type { 
  Organization, 
  UserProfile, 
  Service, 
  Schedule, 
  Appointment, 
  TimeSlot,
  MembershipPlan,
  CustomerSubscription,
  Product,
  FinancialMetrics
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
  { id: 'sch-0-' + orgId, organization_id: orgId, day_of_week: 0, start_time: '09:00', end_time: '14:00', is_closed: true, has_break: false, break_start: '12:00', break_end: '13:00', slot_interval: 60 },
  { id: 'sch-1-' + orgId, organization_id: orgId, day_of_week: 1, start_time: '09:00', end_time: '19:00', is_closed: false, has_break: false, break_start: '12:00', break_end: '13:00', slot_interval: 60 },
  { id: 'sch-2-' + orgId, organization_id: orgId, day_of_week: 2, start_time: '09:00', end_time: '19:00', is_closed: false, has_break: false, break_start: '12:00', break_end: '13:00', slot_interval: 60 },
  { id: 'sch-3-' + orgId, organization_id: orgId, day_of_week: 3, start_time: '09:00', end_time: '19:00', is_closed: false, has_break: false, break_start: '12:00', break_end: '13:00', slot_interval: 60 },
  { id: 'sch-4-' + orgId, organization_id: orgId, day_of_week: 4, start_time: '09:00', end_time: '19:00', is_closed: false, has_break: false, break_start: '12:00', break_end: '13:00', slot_interval: 60 },
  { id: 'sch-5-' + orgId, organization_id: orgId, day_of_week: 5, start_time: '09:00', end_time: '20:00', is_closed: false, has_break: false, break_start: '12:00', break_end: '13:00', slot_interval: 60 },
  { id: 'sch-6-' + orgId, organization_id: orgId, day_of_week: 6, start_time: '08:30', end_time: '18:00', is_closed: false, has_break: false, break_start: '12:00', break_end: '13:00', slot_interval: 60 },
];

export const DEFAULT_PLANS_FACTORY = (_orgId: string): MembershipPlan[] => [];

export const DEFAULT_PRODUCTS_FACTORY = (_orgId: string): Product[] => [];

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

          // 1. Buscar perfil do usuário no Supabase (por auth_user_id oficial, id ou e-mail)
          let userProfile: any = null;
          const { data: profileByAuth } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authUserId)
            .maybeSingle();

          if (profileByAuth) {
            userProfile = profileByAuth;
          } else {
            const { data: profileById } = await supabase
              .from('users')
              .select('*')
              .eq('id', authUserId)
              .maybeSingle();

            if (profileById) {
              userProfile = profileById;
            } else if (userEmail) {
              const { data: profileByEmail } = await supabase
                .from('users')
                .select('*')
                .ilike('email', userEmail.trim())
                .maybeSingle();

              if (profileByEmail) {
                userProfile = profileByEmail;
                try {
                  await supabase
                    .from('users')
                    .update({ auth_user_id: authUserId })
                    .eq('id', profileByEmail.id);
                  userProfile.auth_user_id = authUserId;
                } catch (linkErr) {
                  console.warn('Vínculo auth_user_id:', linkErr);
                }
              }
            }
          }

          if (userProfile && userProfile.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', userProfile.organization_id)
              .maybeSingle();

            if (orgData) {
              setLocalData('saved_org_' + authUserId, orgData);
              return {
                user: userProfile as UserProfile,
                organization: orgData as Organization,
              };
            }
          }

          // 2. Se não existir no banco, cria o registro inicial
          const newOrg: Organization = {
            id: authUserId,
            name: shopName,
            slug: baseSlug,
            plans_enabled: true,
            products_enabled: true,
            created_at: new Date().toISOString(),
          };

          const newUser: UserProfile = {
            id: authUserId,
            organization_id: newOrg.id,
            email: userEmail,
            full_name: fullName,
            role: 'owner',
            active: true,
            created_at: new Date().toISOString(),
          };

          try {
            await supabase.from('organizations').upsert([newOrg]);
            await supabase.from('users').upsert([newUser]);
            await supabase.from('schedules').upsert(DEFAULT_SCHEDULES_FACTORY(newOrg.id));
            await supabase.from('membership_plans').upsert(DEFAULT_PLANS_FACTORY(newOrg.id));
            await supabase.from('products').upsert(DEFAULT_PRODUCTS_FACTORY(newOrg.id));
          } catch (insertErr) {
            console.warn('Inserção no Supabase em fallback:', insertErr);
          }

          setLocalData('saved_org_' + authUserId, newOrg);
          return { user: newUser, organization: newOrg };
        }
      } catch (err) {
        console.warn('Erro na sessão do Supabase:', err);
      }
    }

    // Modo Local / Demonstração
    const localUser = getLocalData<UserProfile | null>('current_user', {
      id: 'user-owner',
      organization_id: 'org-main',
      full_name: 'Proprietário da Barbearia',
      role: 'owner',
      email: 'proprietario@barbearia.com',
      active: true,
    });

    const localOrg = getLocalData<Organization | null>('current_org', {
      id: 'org-main',
      name: 'Ferreira Barber',
      slug: 'ferreirabarber',
      plans_enabled: true,
      products_enabled: true,
    });

    return { user: localUser, organization: localOrg };
  },

  // --- ORGANIZAÇÕES (BARBEARIAS) ---
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
      products_enabled: org.products_enabled,
      whatsapp_auto_enabled: org.whatsapp_auto_enabled,
      whatsapp_api_url: org.whatsapp_api_url,
      whatsapp_api_instance: org.whatsapp_api_instance,
      whatsapp_api_token: org.whatsapp_api_token,
      whatsapp_reminder_hours: org.whatsapp_reminder_hours,
      whatsapp_msg_confirmation: org.whatsapp_msg_confirmation,
      whatsapp_msg_reminder: org.whatsapp_msg_reminder,
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

          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetOrgId);
          if (isUuid) {
            const { data, error } = await supabase
              .from('organizations')
              .update(payload)
              .eq('id', targetOrgId)
              .select()
              .single();

            if (data && !error) {
              setLocalData('saved_org_' + authUserId, data);
              return data as Organization;
            }
          }
        }
      } catch (e) {
        console.error('Erro ao atualizar organização no Supabase:', e);
      }
    }

    const currentOrg = getLocalData<Organization>('current_org', {
      id: org.id,
      name: org.name || 'Minha Barbearia',
      slug: org.slug || 'minha-barbearia',
    });

    const updated = { ...currentOrg, ...org };
    setLocalData('current_org', updated);
    return updated;
  },

  // --- SERVIÇOS DO CATÁLOGO ---
  async getServices(orgId: string): Promise<Service[]> {
    const localList = getLocalData<Service[]>('services_' + orgId, []);
    const localMap = new Map<string, Partial<Service>>();
    localList.forEach(ls => {
      if (ls && ls.id) localMap.set(ls.id, ls);
    });

    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('organization_id', orgId)
            .order('name', { ascending: true });

          if (!error && Array.isArray(data)) {
            const enriched: Service[] = data.map((srv: any) => {
              const local = localMap.get(srv.id);
              const category = srv.category || local?.category || getNormalizedCategory(srv);
              const is_promotional = Boolean(srv.is_promotional ?? local?.is_promotional ?? false);
              const promotional_price = srv.promotional_price !== undefined && srv.promotional_price !== null && srv.promotional_price !== ''
                ? Number(srv.promotional_price)
                : (local?.promotional_price !== undefined && local?.promotional_price !== null ? Number(local.promotional_price) : null);
              const promo_days = srv.promo_days || local?.promo_days || null;

              return {
                ...srv,
                category,
                is_promotional,
                promotional_price,
                promo_days,
              };
            });

            setLocalData('services_' + orgId, enriched);
            return enriched;
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar serviços no Supabase:', e);
      }
    }

    // Normalizar também a lista local garantindo que todo serviço tenha sua categoria correta
    const normalizedLocal = localList.map(s => ({
      ...s,
      category: s.category || getNormalizedCategory(s)
    }));

    return normalizedLocal;
  },

  async saveService(service: Omit<Service, 'id'> & { id?: string }): Promise<Service> {
    const isEditing = Boolean(service.id);
    const serviceId = service.id || 'srv-' + Date.now();
    const finalCategory = service.category || getNormalizedCategory(service);

    const parsedPromoPrice = service.promotional_price !== undefined && service.promotional_price !== null && String(service.promotional_price).trim() !== ''
      ? Number(service.promotional_price)
      : null;

    const finalService: Service = {
      ...service,
      category: finalCategory,
      is_promotional: Boolean(service.is_promotional),
      promotional_price: parsedPromoPrice,
      promo_days: service.promo_days || null,
      id: serviceId,
      created_at: new Date().toISOString(),
    } as Service;

    if (isSupabaseConfigured()) {
      try {
        const isUuidOrg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(service.organization_id);
        if (isUuidOrg) {
          const payload: any = {
            organization_id: service.organization_id,
            name: service.name,
            description: service.description,
            price: Number(service.price) || 0,
            duration: Number(service.duration) || 30,
            active: service.active ?? true,
            category: finalCategory,
            is_promotional: Boolean(service.is_promotional),
            promotional_price: parsedPromoPrice,
            promo_days: service.promo_days || null,
          };

          if (isEditing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId)) {
            payload.id = serviceId;
          }

          let { data, error } = await supabase
            .from('services')
            .upsert([payload])
            .select()
            .single();

          if (error && (error.message?.includes('category') || error.message?.includes('promotional') || error.message?.includes('promo_days'))) {
            delete payload.category;
            delete payload.is_promotional;
            delete payload.promotional_price;
            delete payload.promo_days;
            const retry = await supabase
              .from('services')
              .upsert([payload])
              .select()
              .single();
            data = retry.data;
            error = retry.error;
          }

          if (data && !error) {
            const savedItem: Service = {
              ...(data as Service),
              category: finalCategory,
              is_promotional: Boolean(service.is_promotional),
              promotional_price: parsedPromoPrice,
              promo_days: service.promo_days || null,
            };

            const currentLocal = getLocalData<Service[]>('services_' + service.organization_id, []);
            const filtered = currentLocal.filter(s => s.id !== data.id && s.id !== serviceId);
            const updated = [savedItem, ...filtered];
            setLocalData('services_' + service.organization_id, updated);
            return savedItem;
          }
        }
      } catch (e) {
        console.error('Erro ao salvar serviço no Supabase:', e);
      }
    }

    const currentLocal = getLocalData<Service[]>('services_' + service.organization_id, []);
    const filtered = currentLocal.filter(s => s.id !== serviceId);
    const updated = [finalService, ...filtered];
    setLocalData('services_' + service.organization_id, updated);
    return finalService;
  },

  async deleteService(id: string, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao excluir serviço no Supabase:', e);
      }
    }

    const list = await this.getServices(orgId);
    const updated = list.filter(s => s.id !== id);
    setLocalData('services_' + orgId, updated);
  },

  async createService(service: Omit<Service, 'id'>): Promise<Service> {
    return this.saveService(service);
  },

  async updateService(id: string, updates: Partial<Service>, orgId: string): Promise<Service> {
    const list = await this.getServices(orgId);
    const existing = list.find(s => s.id === id);
    const merged = { ...existing, ...updates, id, organization_id: orgId } as Service;
    return this.saveService(merged);
  },

  // --- PRODUTOS E VITRINE DE ADICIONAIS ---
  async getProducts(orgId: string): Promise<Product[]> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('organization_id', orgId)
            .order('name', { ascending: true });

          if (!error && Array.isArray(data)) {
            setLocalData('products_' + orgId, data);
            return data as Product[];
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar produtos do Supabase:', e);
      }
    }

    const fallback = DEFAULT_PRODUCTS_FACTORY(orgId);
    return getLocalData<Product[]>('products_' + orgId, fallback);
  },

  async saveProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
    const isEditing = Boolean(product.id);
    const prodId = product.id || 'prod-' + Date.now();
    const finalProduct: Product = {
      ...product,
      id: prodId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Product;

    if (isSupabaseConfigured()) {
      try {
        const isUuidOrg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.organization_id);
        if (isUuidOrg) {
          const payload: any = {
            organization_id: product.organization_id,
            name: product.name,
            description: product.description,
            price: Number(product.price) || 0,
            category: product.category || 'Geral',
            image_url: product.image_url,
            stock: product.stock ?? 50,
            active: product.active ?? true,
          };

          if (isEditing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prodId)) {
            payload.id = prodId;
          }

          const { data, error } = await supabase
            .from('products')
            .upsert([payload])
            .select()
            .single();

          if (data && !error) {
            const list = await this.getProducts(product.organization_id);
            const filtered = list.filter(p => p.id !== data.id);
            const updated = [data as Product, ...filtered];
            setLocalData('products_' + product.organization_id, updated);
            return data as Product;
          }
        }
      } catch (e) {
        console.error('Erro ao salvar produto no Supabase:', e);
      }
    }

    const list = await this.getProducts(product.organization_id);
    const filtered = list.filter(p => p.id !== prodId);
    const updated = [finalProduct, ...filtered];
    setLocalData('products_' + product.organization_id, updated);
    return finalProduct;
  },

  async deleteProduct(id: string, orgId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao excluir produto no Supabase:', e);
      }
    }

    const list = await this.getProducts(orgId);
    const updated = list.filter(p => p.id !== id);
    setLocalData('products_' + orgId, updated);
    return true;
  },

  async toggleProductsEnabled(orgId: string, enabled: boolean): Promise<boolean> {
    await this.updateOrganization({ id: orgId, products_enabled: enabled });
    return enabled;
  },

  async decrementProductStock(productId: string, quantity: number, orgId: string): Promise<void> {
    const products = await this.getProducts(orgId);
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const currentStock = prod.stock ?? 50;
    const newStock = Math.max(0, currentStock - quantity);
    const updatedProd = { ...prod, stock: newStock };

    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
        if (isUuid) {
          await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', productId);
        }
      } catch (e) {
        console.error('Erro ao diminuir estoque no Supabase:', e);
      }
    }

    const updatedList = products.map(p => p.id === productId ? updatedProd : p);
    setLocalData('products_' + orgId, updatedList);
  },

  // --- EQUIPE DE BARBEIROS ---
  async getTeam(orgId: string): Promise<UserProfile[]> {
    const localList = getLocalData<UserProfile[]>('team_' + orgId, []);

    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('organization_id', orgId)
            .order('role', { ascending: true });

          if (!error && Array.isArray(data)) {
            const map = new Map<string, UserProfile>();
            for (const b of localList) map.set(b.id, b);
            for (const b of (data as UserProfile[])) map.set(b.id, b);
            const merged = Array.from(map.values());
            if (merged.length > 0) {
              setLocalData('team_' + orgId, merged);
              return merged;
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar equipe do Supabase:', e);
      }
    }

    if (localList && localList.length > 0) {
      return localList;
    }

    return [];
  },

  async saveBarber(barber: Partial<UserProfile> & { organization_id: string }): Promise<UserProfile> {
    const isEditing = Boolean(barber.id);
    const validUuid = barber.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barber.id);
    const barberId = validUuid 
      ? barber.id! 
      : (typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : 'barber-' + Date.now());

    const finalBarber: UserProfile = {
      id: barberId,
      organization_id: barber.organization_id,
      full_name: barber.full_name || 'Novo Barbeiro',
      email: barber.email,
      role: barber.role || 'barber',
      phone: barber.phone,
      avatar_url: barber.avatar_url,
      rating: barber.rating || 5.0,
      active: barber.active ?? true,
      created_at: new Date().toISOString(),
    };

    // Salvar local imediatamente
    const currentList = getLocalData<UserProfile[]>('team_' + barber.organization_id, []);
    const filteredLocal = currentList.filter(b => b.id !== barberId && b.id !== barber.id);
    const updatedLocal = [finalBarber, ...filteredLocal];
    setLocalData('team_' + barber.organization_id, updatedLocal);

    if (isSupabaseConfigured()) {
      try {
        const isUuidOrg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barber.organization_id);
        if (isUuidOrg) {
          const payload: any = {
            organization_id: barber.organization_id,
            full_name: barber.full_name || 'Novo Barbeiro',
            email: barber.email || null,
            role: barber.role || 'barber',
            phone: barber.phone || null,
            avatar_url: barber.avatar_url || null,
            rating: Number(barber.rating) || 5.0,
            active: barber.active ?? true,
          };

          if ((barber as any).auth_user_id) {
            payload.auth_user_id = (barber as any).auth_user_id;
          }

          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barberId)) {
            payload.id = barberId;
          }

          const { data, error } = await supabase
            .from('users')
            .upsert([payload])
            .select()
            .single();

          if (data && !error) {
            const list = getLocalData<UserProfile[]>('team_' + barber.organization_id, []);
            const filtered = list.filter(b => b.id !== data.id && b.id !== barber.id);
            const updated = [data as UserProfile, ...filtered];
            setLocalData('team_' + barber.organization_id, updated);
            return data as UserProfile;
          } else if (error) {
            console.error('Erro detalhado ao gravar barbeiro no Supabase:', error);
          }
        }
      } catch (e) {
        console.error('Erro ao salvar barbeiro no Supabase:', e);
      }
    }

    return finalBarber;
  },

  async deleteBarber(id: string, orgId: string): Promise<void> {
    const currentList = getLocalData<UserProfile[]>('team_' + orgId, []);
    const updated = currentList.filter(b => b.id !== id);
    setLocalData('team_' + orgId, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('users').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao excluir barbeiro no Supabase:', e);
      }
    }
  },

  async createTeamMember(member: Partial<UserProfile> & { organization_id: string; password?: string }): Promise<UserProfile> {
    const { password, ...barberData } = member;

    // Se o dono forneceu e-mail e senha, registrar no Supabase Auth com client isolado sem deslogar o dono
    if (password && barberData.email && isSupabaseConfigured()) {
      try {
        const isolated = createIsolatedClient();
        const { data: authResult, error: authError } = await isolated.auth.signUp({
          email: barberData.email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: barberData.full_name || 'Barbeiro',
              role: barberData.role || 'barber',
              phone: barberData.phone || '',
              organization_id: barberData.organization_id,
            },
          },
        });

        if (authError) {
          console.warn('Aviso ao criar credencial no Supabase Auth:', authError);
          // Se o usuário já existia no auth, tentar atualizar a senha via RPC
          if (authError.message?.toLowerCase().includes('already registered')) {
            try {
              await supabase.rpc('set_barber_password', {
                target_user_id: barberData.id,
                new_password: password.trim(),
              });
            } catch (rpcErr) {
              console.warn('RPC set_barber_password fallback:', rpcErr);
            }
          }
        } else if (authResult?.user) {
          barberData.id = authResult.user.id;
          (barberData as any).auth_user_id = authResult.user.id;
        }
      } catch (err) {
        console.warn('Erro ao registrar credenciais de acesso no Auth:', err);
      }
    }

    return this.saveBarber(barberData);
  },

  async updateTeamMember(
    id: string, 
    updates: Partial<UserProfile> & { password?: string }, 
    orgId: string
  ): Promise<UserProfile> {
    const { password, ...barberUpdates } = updates;
    const list = await this.getTeam(orgId);
    const existing = list.find(b => b.id === id);
    const merged: any = { ...existing, ...barberUpdates, id, organization_id: orgId };

    // Se o dono forneceu uma nova senha ao editar o barbeiro
    if (password && merged.email && isSupabaseConfigured()) {
      try {
        let updatedViaRpc = false;
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_barber_password', {
            target_user_id: id,
            new_password: password.trim(),
          });
          if (!rpcErr && rpcRes?.success && !rpcRes?.needs_signup) {
            updatedViaRpc = true;
          }
        } catch (rpcErr) {
          // RPC pode não estar criada ainda no banco
        }

        // Se não foi atualizado via RPC (ou usuário ainda não estava no auth.users), cria a conta isolada
        if (!updatedViaRpc) {
          const isolated = createIsolatedClient();
          const { data: authResult, error: authError } = await isolated.auth.signUp({
            email: merged.email.trim(),
            password: password.trim(),
            options: {
              data: {
                full_name: merged.full_name || 'Barbeiro',
                role: merged.role || 'barber',
                phone: merged.phone || '',
                organization_id: orgId,
              },
            },
          });

          if (authResult?.user) {
            merged.auth_user_id = authResult.user.id;
          } else if (authError) {
            console.warn('Aviso ao registrar/atualizar senha no Auth:', authError.message);
          }
        }
      } catch (err) {
        console.warn('Erro ao processar credenciais ao atualizar barbeiro:', err);
      }
    }

    return this.saveBarber(merged);
  },

  async deleteTeamMember(id: string, orgId: string): Promise<void> {
    return this.deleteBarber(id, orgId);
  },

  // --- HORÁRIOS DE FUNCIONAMENTO & ESCALAS INDIVIDUAIS ---
  async getSchedules(orgId: string, userId?: string | null): Promise<Schedule[]> {
    const cacheKey = `schedules_${orgId}_${userId || 'general'}`;
    const localList = getLocalData<Schedule[]>(cacheKey, []);

    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          let query = supabase
            .from('schedules')
            .select('*')
            .eq('organization_id', orgId);

          if (userId) {
            query = query.eq('user_id', userId);
          } else {
            query = query.is('user_id', null);
          }

          const { data, error } = await query.order('day_of_week', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            const formatted = (data as Schedule[]).map(s => ({
              ...s,
              has_break: Boolean(s.has_break),
              is_closed: Boolean(s.is_closed),
            }));
            setLocalData(cacheKey, formatted);
            return formatted;
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar horários no Supabase:', e);
      }
    }

    if (localList && localList.length > 0) {
      return localList;
    }

    const fallback = DEFAULT_SCHEDULES_FACTORY(orgId).map(s => ({
      ...s,
      user_id: userId || null,
      id: `sch-${s.day_of_week}-${orgId}-${userId || 'general'}`
    }));
    return fallback;
  },

  async saveSchedules(orgId: string, schedules: Schedule[], userId?: string | null): Promise<void> {
    const cacheKey = `schedules_${orgId}_${userId || 'general'}`;
    const formatted = schedules.map(s => {
      const isUuid = s.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id);
      return {
        ...s,
        id: isUuid ? s.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : s.id),
        organization_id: orgId,
        user_id: userId || null,
        day_of_week: Number(s.day_of_week),
        start_time: s.start_time.length === 5 ? s.start_time + ':00' : s.start_time,
        end_time: s.end_time.length === 5 ? s.end_time + ':00' : s.end_time,
        is_closed: Boolean(s.is_closed),
        has_break: Boolean(s.has_break),
        break_start: s.break_start ? (s.break_start.length === 5 ? s.break_start + ':00' : s.break_start) : '12:00:00',
        break_end: s.break_end ? (s.break_end.length === 5 ? s.break_end + ':00' : s.break_end) : '13:00:00',
        slot_interval: Number(s.slot_interval) || 60,
      };
    });

    // Salvar local imediatamente
    setLocalData(cacheKey, formatted);

    if (isSupabaseConfigured()) {
      try {
        const isUuidOrg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuidOrg) {
          // 1. Buscar os IDs existentes no banco para cada dia da semana
          let query = supabase
            .from('schedules')
            .select('id, day_of_week')
            .eq('organization_id', orgId);

          if (userId) {
            query = query.eq('user_id', userId);
          } else {
            query = query.is('user_id', null);
          }

          const { data: existingRows } = await query;
          const idMap = new Map<number, string>();
          if (Array.isArray(existingRows)) {
            existingRows.forEach((r: any) => idMap.set(r.day_of_week, r.id));
          }

          const payload = formatted.map(s => {
            const existingId = idMap.get(s.day_of_week);
            const clean: any = {
              organization_id: s.organization_id,
              user_id: s.user_id,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
              is_closed: s.is_closed,
              has_break: s.has_break,
              break_start: s.break_start,
              break_end: s.break_end,
              slot_interval: s.slot_interval,
            };
            if (existingId) {
              clean.id = existingId;
            } else if (s.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id)) {
              clean.id = s.id;
            }
            return clean;
          });

          // Se os 7 dias já existiam no banco com seus IDs reais, atualiza por id
          const allExistInDb = idMap.size === 7;
          if (allExistInDb) {
            const { error: upsertErr } = await supabase.from('schedules').upsert(payload, { onConflict: 'id' });
            if (!upsertErr) {
              return;
            }
            console.warn('Upsert por id falhou, tentando reinserção limpa:', upsertErr);
          }

          // Se ainda não existiam no banco ou se o upsert falhou: limpa e faz insert limpo
          if (userId) {
            await supabase.from('schedules').delete().eq('organization_id', orgId).eq('user_id', userId);
          } else {
            await supabase.from('schedules').delete().eq('organization_id', orgId).is('user_id', null);
          }
          const cleanInserts = payload.map(p => {
            const { id, ...rest } = p;
            return rest;
          });
          const { error: insertErr } = await supabase.from('schedules').insert(cleanInserts);
          if (insertErr) {
            console.error('Erro ao inserir horários no Supabase:', insertErr);
          }
        }
      } catch (e) {
        console.error('Erro ao salvar horários no Supabase:', e);
      }
    }
  },

  // --- AGENDAMENTOS (APPOINTMENTS) ---
  async getAppointments(orgId: string, dateStr?: string, barberId?: string): Promise<Appointment[]> {
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
        if (isUuid) {
          let query = supabase
            .from('appointments')
            .select('*, service:services(*), barber:users(*)')
            .eq('organization_id', orgId);

          if (barberId && barberId !== 'all') {
            query = query.eq('user_id', barberId);
          }

          const { data, error } = await query.order('start_time', { ascending: true });

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

    let list = getLocalData<Appointment[]>('appointments_' + orgId, []);
    if (barberId && barberId !== 'all') {
      list = list.filter(a => a.user_id === barberId);
    }
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
          products: appointment.products || null,
          products_total: Number(appointment.products_total) || 0,
          additional_services: appointment.additional_services || null,
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
              const { data: newUser } = await supabase
                .from('users')
                .insert([{
                  organization_id: payload.organization_id,
                  full_name: 'Profissional da Barbearia',
                  role: 'owner',
                  active: true
                }])
                .select('id')
                .single();
              if (newUser) {
                payload.user_id = newUser.id;
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

          if (error && (error.message?.includes('products') || error.message?.includes('is_subscription') || error.message?.includes('additional_services'))) {
            delete payload.products;
            delete payload.products_total;
            delete payload.is_subscription;
            delete payload.additional_services;
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
          }

          // Fallback resiliente: se a gravação com .select() falhou (ex: política RLS não permite SELECT a anon),
          // realizamos um insert puro no Supabase com UUID explícito para salvar o agendamento no banco
          if (error) {
            delete payload.products;
            delete payload.products_total;
            delete payload.is_subscription;
            delete payload.additional_services;
            const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
            if (fallbackId) payload.id = fallbackId;

            const pureInsert = await supabase
              .from('appointments')
              .insert([payload]);

            if (!pureInsert.error) {
              const savedApt: Appointment = {
                ...newApt,
                id: payload.id || newApt.id,
              };
              const list = getLocalData<Appointment[]>('appointments_' + appointment.organization_id, []);
              setLocalData('appointments_' + appointment.organization_id, [savedApt, ...list]);
              return savedApt;
            } else {
              console.error('Erro detalhado ao gravar agendamento no Supabase:', error, pureInsert.error);
            }
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
    const list = getLocalData<Appointment[]>('appointments_' + orgId, []);
    const apt = list.find(a => a.id === id);

    // Quando o atendimento for marcado como concluído, dar baixa automática no estoque de cada produto
    if (status === 'completed' && apt && Array.isArray(apt.products)) {
      for (const item of apt.products) {
        if (item.product_id && item.quantity > 0) {
          await this.decrementProductStock(item.product_id, item.quantity, orgId);
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
        if (error) console.warn('Aviso ao atualizar status no Supabase:', error);
      } catch (e) {
        console.error('Erro ao atualizar status do agendamento:', e);
      }
    }

    const updated = list.map(a => a.id === id ? { ...a, status } : a);
    setLocalData('appointments_' + orgId, updated);
  },

  async deleteAppointment(id: string, orgId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) {
          console.warn('Aviso ao excluir agendamento do Supabase:', error);
        }
      } catch (e) {
        console.error('Erro ao excluir agendamento do Supabase:', e);
      }
    }

    const list = getLocalData<Appointment[]>('appointments_' + orgId, []);
    const updated = list.filter(a => a.id !== id);
    setLocalData('appointments_' + orgId, updated);
    return true;
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

          if (!error && Array.isArray(data)) {
            setLocalData('plans_' + orgId, data);
            return data as MembershipPlan[];
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar planos do Supabase:', e);
      }
    }

    const fallback = DEFAULT_PLANS_FACTORY(orgId);
    return getLocalData<MembershipPlan[]>('plans_' + orgId, fallback);
  },

  async savePlan(plan: Omit<MembershipPlan, 'id'> & { id?: string }): Promise<MembershipPlan> {
    const isEditing = Boolean(plan.id);
    const planId = plan.id || 'plan-' + Date.now();
    const finalPlan: MembershipPlan = {
      ...plan,
      id: planId,
      created_at: new Date().toISOString(),
    } as MembershipPlan;

    if (isSupabaseConfigured()) {
      try {
        const isUuidOrg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan.organization_id);
        if (isUuidOrg) {
          const payload: any = {
            organization_id: plan.organization_id,
            name: plan.name,
            description: plan.description,
            price: Number(plan.price) || 0,
            cuts_per_month: Number(plan.cuts_per_month) || 2,
            active: plan.active ?? true,
          };

          if (isEditing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId)) {
            payload.id = planId;
          }

          const { data, error } = await supabase
            .from('membership_plans')
            .upsert([payload])
            .select()
            .single();

          if (data && !error) {
            const list = await this.getPlans(plan.organization_id);
            const filtered = list.filter(p => p.id !== data.id);
            const updated = [data as MembershipPlan, ...filtered];
            setLocalData('plans_' + plan.organization_id, updated);
            return data as MembershipPlan;
          }
        }
      } catch (e) {
        console.error('Erro ao salvar plano no Supabase:', e);
      }
    }

    const list = await this.getPlans(plan.organization_id);
    const filtered = list.filter(p => p.id !== planId);
    const updated = [finalPlan, ...filtered];
    setLocalData('plans_' + plan.organization_id, updated);
    return finalPlan;
  },

  async deletePlan(id: string, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('membership_plans').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao excluir plano no Supabase:', e);
      }
    }

    const list = await this.getPlans(orgId);
    const updated = list.filter(p => p.id !== id);
    setLocalData('plans_' + orgId, updated);
  },

  async createPlan(plan: Omit<MembershipPlan, 'id'>): Promise<MembershipPlan> {
    return this.savePlan(plan);
  },

  async updatePlan(id: string, updates: Partial<MembershipPlan>, orgId: string): Promise<MembershipPlan> {
    const list = await this.getPlans(orgId);
    const existing = list.find(p => p.id === id);
    const merged = { ...existing, ...updates, id, organization_id: orgId } as MembershipPlan;
    return this.savePlan(merged);
  },

  async togglePlansEnabled(orgId: string, enabled: boolean): Promise<boolean> {
    await this.updateOrganization({ id: orgId, plans_enabled: enabled });
    return enabled;
  },

  // --- CLIENTES ASSINANTES (VIP MEMBERS) ---
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
      } catch (e) {
        console.warn('Erro ao buscar assinaturas do Supabase:', e);
      }
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
        const isUuidOrg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub.organization_id);
        if (isUuidOrg) {
          const payload: any = {
            organization_id: sub.organization_id,
            plan_id: sub.plan_id,
            client_name: sub.client_name,
            client_phone: sub.client_phone,
            cuts_used: Number(sub.cuts_used) || 0,
            cuts_total: Number(sub.cuts_total) || 2,
            renewal_date: sub.renewal_date,
            status: sub.status || 'active',
          };

          const { data, error } = await supabase
            .from('customer_subscriptions')
            .insert([payload])
            .select('*, plan:membership_plans(*)')
            .single();

          if (data && !error) {
            const list = getLocalData<CustomerSubscription[]>('subscriptions_' + sub.organization_id, []);
            setLocalData('subscriptions_' + sub.organization_id, [data, ...list]);
            return data as CustomerSubscription;
          }
        }
      } catch (e) {
        console.error('Erro ao registrar assinatura no Supabase:', e);
      }
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
      } catch (e) {
        console.error('Erro ao atualizar assinatura no Supabase:', e);
      }
    }

    const list = getLocalData<CustomerSubscription[]>('subscriptions_' + orgId, []);
    const updated = list.map(s => s.id === id ? { ...s, ...updates } : s);
    setLocalData('subscriptions_' + orgId, updated);
  },

  async deleteSubscription(id: string, orgId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customer_subscriptions').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao excluir assinatura no Supabase:', e);
      }
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

    const isSpecificBarber = barberId && barberId !== 'any';
    const schedules = await this.getSchedules(orgId, isSpecificBarber ? barberId : null);
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

    const slots: TimeSlot[] = [];
    // Intervalo de agendamentos: de 1 em 1 hora (60 minutos)
    const intervalMinutes = daySchedule.slot_interval || 60;

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const now = new Date();
    const isToday = getLocalDateString(targetDate) === getLocalDateString(now);
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

    // Configuração de Horário de Almoço / Pausa
    let breakStartMinutes = -1;
    let breakEndMinutes = -1;
    if (daySchedule.has_break && daySchedule.break_start && daySchedule.break_end) {
      const [bStartH, bStartM] = daySchedule.break_start.split(':').map(Number);
      const [bEndH, bEndM] = daySchedule.break_end.split(':').map(Number);
      breakStartMinutes = bStartH * 60 + bStartM;
      breakEndMinutes = bEndH * 60 + bEndM;
    }

    while (currentMinutes + Math.min(serviceDuration, intervalMinutes) <= endMinutes) {
      // Se o horário cair dentro da pausa/almoço do profissional, pular este horário
      if (breakStartMinutes !== -1 && breakEndMinutes !== -1) {
        if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
          currentMinutes += intervalMinutes;
          continue;
        }
      }

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
  },

  // --- AUTOMAÇÃO WHATSAPP (Z-API / EVOLUTION API) ---
  async sendAutomatedWhatsAppMessage(params: {
    org: Organization;
    phone: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Módulo de automação de WhatsApp via API paga configurado em manutenção
    return { 
      success: false, 
      error: 'Automação de WhatsApp via gateway pago está temporariamente em manutenção.' 
    };
  },

  // --- RELATÓRIOS E MÉTRICAS FINANCEIRAS ---
  async getFinancialMetrics(orgId: string, period: 'today' | '7days' | 'month' | 'all', barberId?: string): Promise<FinancialMetrics> {
    const allAppointments = await this.getAppointments(orgId, undefined, barberId);
    const services = await this.getServices(orgId);
    const team = await this.getTeam(orgId);

    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Filtrar pelo período
    const filtered = allAppointments.filter(apt => {
      const aptDateStr = getLocalDateString(apt.start_time);
      if (period === 'today') {
        return aptDateStr === todayStr;
      }
      if (period === '7days') {
        const aptDate = new Date(apt.start_time);
        const diffDays = (now.getTime() - aptDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (period === 'month') {
        const aptDate = new Date(apt.start_time);
        return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });

    const nonCancelled = filtered.filter(a => a.status !== 'cancelled');
    const completed = filtered.filter(a => a.status === 'completed');
    const cancelled = filtered.filter(a => a.status === 'cancelled');

    // Cálculos de Receita
    let totalRevenue = 0;
    let servicesRevenue = 0;
    let productsRevenue = 0;

    const serviceCounts: Record<string, { count: number; revenue: number; name: string }> = {};
    const productCounts: Record<string, { count: number; revenue: number; name: string }> = {};
    const barberCounts: Record<string, { count: number; revenue: number; name: string; avatarUrl?: string }> = {};

    nonCancelled.forEach(apt => {
      const aptPrice = Number(apt.price) || 0;
      const aptProductsTotal = Number(apt.products_total) || 0;
      const servicePrice = Math.max(0, aptPrice - aptProductsTotal);

      totalRevenue += aptPrice;
      servicesRevenue += servicePrice;
      productsRevenue += aptProductsTotal;

      // Agregação de Serviços
      const srvName = apt.service?.name || services.find(s => s.id === apt.service_id)?.name || 'Corte Barbearia';
      if (!serviceCounts[srvName]) {
        serviceCounts[srvName] = { count: 0, revenue: 0, name: srvName };
      }
      serviceCounts[srvName].count += 1;
      serviceCounts[srvName].revenue += servicePrice;

      // Agregação de Produtos
      if (Array.isArray(apt.products)) {
        apt.products.forEach(p => {
          if (!productCounts[p.name]) {
            productCounts[p.name] = { count: 0, revenue: 0, name: p.name };
          }
          productCounts[p.name].count += (p.quantity || 1);
          productCounts[p.name].revenue += (p.price * (p.quantity || 1));
        });
      }

      // Agregação de Barbeiro
      const barber = team.find(t => t.id === apt.user_id) || apt.barber;
      const bName = barber?.full_name || 'Barbeiro';
      if (!barberCounts[apt.user_id || bName]) {
        barberCounts[apt.user_id || bName] = { 
          count: 0, 
          revenue: 0, 
          name: bName, 
          avatarUrl: barber?.avatar_url 
        };
      }
      barberCounts[apt.user_id || bName].count += 1;
      barberCounts[apt.user_id || bName].revenue += aptPrice;
    });

    const averageTicket = nonCancelled.length > 0 ? (totalRevenue / nonCancelled.length) : 0;

    // Top Serviços
    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(s => ({
        ...s,
        percentage: totalRevenue > 0 ? Math.round((s.revenue / totalRevenue) * 100) : 0
      }));

    // Top Produtos
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({
        ...p,
        percentage: productsRevenue > 0 ? Math.round((p.revenue / productsRevenue) * 100) : 0
      }));

    // Performance por Barbeiro
    const barberPerformance = Object.entries(barberCounts)
      .map(([barberId, val]) => ({
        barberId,
        barberName: val.name,
        avatarUrl: val.avatarUrl,
        cutsCount: val.count,
        revenue: val.revenue,
        percentage: totalRevenue > 0 ? Math.round((val.revenue / totalRevenue) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Faturamento Diário (Últimos 7 dias ou do mês)
    const dailyMap: Record<string, { revenue: number; count: number; dateStr: string; label: string }> = {};
    const daysBack = period === 'today' ? 1 : period === '7days' ? 7 : 14;

    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dStr = getLocalDateString(d);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
      dailyMap[dStr] = { revenue: 0, count: 0, dateStr: dStr, label };
    }

    nonCancelled.forEach(apt => {
      const dStr = getLocalDateString(apt.start_time);
      if (dailyMap[dStr]) {
        dailyMap[dStr].revenue += Number(apt.price) || 0;
        dailyMap[dStr].count += 1;
      }
    });

    const dailyRevenue = Object.values(dailyMap).map(d => ({
      date: d.dateStr,
      dayLabel: d.label,
      revenue: d.revenue,
      appointmentsCount: d.count,
    }));

    return {
      totalRevenue,
      servicesRevenue,
      productsRevenue,
      totalAppointments: filtered.length,
      completedAppointments: completed.length,
      cancelledAppointments: cancelled.length,
      averageTicket,
      topServices,
      topProducts,
      barberPerformance,
      dailyRevenue
    };
  }
};
