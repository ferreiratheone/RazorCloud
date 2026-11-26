import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://kwnltgrcrcfrbzwbqjmd.supabase.co';

export const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bmx0Z3JjcmNmcmJ6d2Jxam1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODUwMDYsImV4cCI6MjEwMzg2MTAwNn0.O6pi9anHS3tzl4Ib1CbB9BbXNUgKYVZHKvbdkcVzLHI';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    !supabaseUrl.includes('your-project.supabase.co') &&
    !supabaseAnonKey.includes('your-anon-key')
  );
}

/**
 * Supabase client singleton para uso em todo o frontend
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();

/**
 * Cliente isolado sem persistência de sessão para criar contas de funcionários
 * sem deslogar o proprietário atual.
 */
export function createIsolatedClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
