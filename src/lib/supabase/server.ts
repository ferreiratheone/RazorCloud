import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Cria um cliente Supabase Server para uso em Server Components, Server Actions e Route Handlers no Next.js App Router.
 * Recebe o cookieStore do next/headers.
 *
 * Exemplo em Server Component / Server Action:
 * ```ts
 * import { cookies } from 'next/headers';
 * import { createClient } from '@/src/lib/supabase/server';
 *
 * const cookieStore = cookies();
 * const supabase = createClient(cookieStore);
 * ```
 */
export function createClient(cookieStore?: any) {
  if (!cookieStore) {
    // Fallback para ambientes onde cookies não foram passados diretamente
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // O método `set` pode falhar se chamado a partir de um Server Component puro.
          // Isso é esperado caso haja um Middleware atualizando a sessão.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        } catch (error) {
          // O método `remove` pode falhar em Server Components puros.
        }
      },
    },
  });
}

/**
 * Cliente Supabase com permissões de Administrador (Service Role).
 * ATENÇÃO: NUNCA execute este client no lado do cliente (navegador).
 * Utilizado para tarefas administrativas, triggers, webhooks e bypass seguro de RLS no backend.
 */
export function createAdminClient() {
  if (!supabaseServiceRoleKey) {
    console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY não está configurada no ambiente.');
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
