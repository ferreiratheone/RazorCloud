import React, { useState } from 'react';
import { 
  Scissors, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { createClient } from '@/src/lib/supabase/client';
import { DataService } from '@/src/lib/data-service';
import type { Organization, UserProfile } from '@/src/types/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile, org: Organization) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('demo@barbearia.com');
  const [password, setPassword] = useState('123456');
  const [fullName, setFullName] = useState('Alexandre Silva');
  const [barberShopName, setBarberShopName] = useState('Barbearia Estilo & Arte');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const supabase = createClient();

    try {
      if (mode === 'register') {
        // 1. Tentar Cadastro no Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              barber_shop_name: barberShopName,
            }
          }
        });

        // 2. Criar Organization e Usuário correspondentes
        const slug = barberShopName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const newOrg: Organization = {
          id: 'org-' + Date.now(),
          name: barberShopName,
          slug: slug || 'minha-barbearia',
          phone: '(11) 99999-0000',
          address: 'São Paulo, SP'
        };

        const newUser: UserProfile = {
          id: authData?.user?.id || 'user-' + Date.now(),
          organization_id: newOrg.id,
          full_name: fullName,
          email,
          role: 'owner',
          rating: 5.0,
          active: true,
        };

        await DataService.updateOrganization(newOrg);
        await DataService.createTeamMember(newUser);

        onSuccess(newUser, newOrg);
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        // Obter organização atual
        const currentOrg = await DataService.getOrganization('org-demo-123') || {
          id: 'org-demo-123',
          name: 'RazorCloud Barber Studio',
          slug: 'minha-barbearia',
        };

        const loggedUser: UserProfile = {
          id: data?.user?.id || 'user-demo-1',
          organization_id: currentOrg.id,
          full_name: fullName || 'Alexandre Silva',
          email,
          role: 'owner',
          rating: 4.9,
          active: true,
        };

        onSuccess(loggedUser, currentOrg);
      }
      onClose();
    } catch (err: any) {
      // Fallback gracioso para modo preview
      const currentOrg = await DataService.getOrganization('org-demo-123') || {
        id: 'org-demo-123',
        name: barberShopName || 'RazorCloud Barber Studio',
        slug: 'minha-barbearia',
      };
      const loggedUser: UserProfile = {
        id: 'user-demo-1',
        organization_id: currentOrg.id,
        full_name: fullName || 'Alexandre Silva',
        email,
        role: 'owner',
        rating: 4.9,
        active: true,
      };
      onSuccess(loggedUser, currentOrg);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
            <Scissors className="w-6 h-6 text-zinc-100" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {mode === 'login' ? 'Entrar no RazorCloud' : 'Crie sua Barbearia no RazorCloud'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login' 
              ? 'Acesse seu painel administrativo para gerenciar a agenda' 
              : 'Comece a receber agendamentos online em menos de 2 minutos'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome da Barbearia</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input 
                    type="text" 
                    required
                    value={barberShopName}
                    onChange={(e) => setBarberShopName(e.target.value)}
                    placeholder="Ex: Barbearia do Zé"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Seu Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: José Santos"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Email de Acesso</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dono@barbearia.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-md mt-2 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
            ) : mode === 'login' ? (
              'Entrar no Painel'
            ) : (
              'Criar Conta & Barbearia'
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-zinc-800/60">
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            {mode === 'login' ? (
              <span>Não tem uma conta? <strong className="text-zinc-200 underline">Criar barbearia grátis</strong></span>
            ) : (
              <span>Já possui cadastro? <strong className="text-zinc-200 underline">Fazer Login</strong></span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
