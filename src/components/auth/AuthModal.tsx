import React, { useState } from 'react';
import { 
  Scissors, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  X, 
  Shield, 
  MessageCircle 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase/client';
import { DataService } from '@/src/lib/data-service';
import type { Organization, UserProfile } from '@/src/types/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile, org: Organization) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSupabaseConfigured()) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authErr) throw authErr;

        if (authData.user) {
          const authUserId = authData.user.id;
          const userEmail = authData.user.email || email.trim();

          const { user, organization } = await DataService.getCurrentUserProfile();
          
          if (user && organization) {
            onSuccess(user, organization);
            onClose();
            return;
          }

          // Garantia de sessão para o usuário autenticado
          const fallbackOrg: Organization = {
            id: authUserId,
            name: 'Minha Barbearia',
            slug: 'barbearia-' + authUserId.substring(0, 4),
          };
          const fallbackUser: UserProfile = {
            id: authUserId,
            organization_id: fallbackOrg.id,
            email: userEmail,
            full_name: 'Proprietário',
            role: 'owner',
            active: true,
          };
          onSuccess(fallbackUser, fallbackOrg);
          onClose();
          return;
        }
      } else {
        // Modo Local / Testes
        const user: UserProfile = {
          id: 'user-owner',
          organization_id: 'org-main',
          full_name: 'Proprietário da Barbearia',
          role: 'owner',
          email: email.trim() || 'demo@barbearia.com',
          active: true,
        };
        const org: Organization = {
          id: 'org-main',
          name: 'Minha Barbearia',
          slug: 'minha-barbearia',
        };
        onSuccess(user, org);
        onClose();
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
        setErrorMsg('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (msg.includes('email not confirmed')) {
        setErrorMsg('E-mail ainda não confirmado. Ative a confirmação automática no Supabase.');
      } else {
        setErrorMsg(err?.message || 'Ocorreu um erro ao realizar o login.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Botão Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Exclusivo B2B */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3 shadow-xl">
            <img 
              src="/razorcloud.webp" 
              alt="RazorCloud Logo" 
              className="w-full h-full object-cover" 
            />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">RazorCloud Admin</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Painel restrito para donos e profissionais autorizados
          </p>
        </div>

        {/* Formulário de Login Seguro */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="text-xs text-zinc-400 font-semibold block mb-1">E-mail Cadastrado</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@barbearia.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold block mb-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-3"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
            ) : (
              <>Acessar Painel <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Rodapé Comercial / Suporte de Vendas */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Acesso liberado sob licença comercial ativa</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Ainda não tem sua barbearia no sistema ou esqueceu sua senha?
          </p>
          <a
            href="https://wa.me/?text=Olá!%20Gostaria%20de%20adquirir%20o%20sistema%20RazorCloud%20para%20minha%20barbearia."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Falar com o Administrador / Comprar Acesso
          </a>
        </div>

      </div>
    </div>
  );
}
