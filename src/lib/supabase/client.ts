import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};

const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  metaEnv.VITE_SUPABASE_URL || 
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  'https://your-project.supabase.co';

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  metaEnv.VITE_SUPABASE_ANON_KEY || 
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'your-anon-key';

/**
 * Supabase client for browser environments (Client Components).
 * Utiliza @supabase/ssr createBrowserClient para gerenciar sessões e cookies automaticamente.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Instância singleton do client do navegador para uso rápido em Client Components.
 */
export const supabase = createClient();
