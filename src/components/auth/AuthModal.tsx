import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  MessageCircle,
  Instagram,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase/client';
import { DataService } from '@/src/lib/data-service';
import type { Organization, UserProfile } from '@/src/types/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: UserProfile, org: Organization) => void;
  isFullPage?: boolean;
}

export function AuthModal({ isOpen, onClose, onSuccess, isFullPage = false }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
            if (onClose) onClose();
            return;
          }

          const fallbackOrg: Organization = {
            id: authUserId,
            name: 'Ferreira Barber',
            slug: 'ferreirabarber',
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
          if (onClose) onClose();
          return;
        }
      } else {
        // Modo Local / Demo
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
          name: 'Ferreira Barber',
          slug: 'ferreirabarber',
        };
        onSuccess(user, org);
        if (onClose) onClose();
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('email not confirmed')) {
        setErrorMsg('E-mail ainda não confirmado no Supabase. É necessário desmarcar a opção "Confirm email" no painel do Supabase (Authentication -> Providers -> Email) para login imediato.');
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
        setErrorMsg('E-mail ou senha incorretos. Verifique os dados digitados.');
      } else {
        setErrorMsg(err?.message || 'Ocorreu um erro ao realizar o login.');
      }
    } finally {
      setLoading(false);
    }
  }

  const containerClasses = isFullPage
    ? "min-h-screen w-full bg-zinc-950 text-zinc-50 flex flex-col items-center justify-between p-4 sm:p-8"
    : "fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4";

  return (
    <div className={containerClasses}>
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Botão Fechar (apenas se for modal) */}
        {!isFullPage && onClose && (
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

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
            Painel restrito para donos e barbeiros credenciados
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

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
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 p-0.5 transition-colors"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Acessando...</>
            ) : (
              <>Entrar no Painel <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Rodapé Comercial / Suporte de Vendas */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Acesso liberado sob licença comercial ativa</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Deseja adquirir o sistema para a sua barbearia?
          </p>
          <a
            href="https://wa.me/?text=Olá!%20Gostaria%20de%20adquirir%20o%20sistema%20RazorCloud%20para%20minha%20barbearia."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Falar com o Administrador no WhatsApp
          </a>
        </div>

      </div>

      {isFullPage && (
        <footer className="w-full text-center pt-6 pb-2 text-[11px] text-zinc-500 flex flex-wrap items-center justify-center gap-1.5">
          <span>RazorCloud SaaS</span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1 text-zinc-400">
            Desenvolvido por{' '}
            <a 
              href="https://instagram.com/ferreiraatheone" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-pink-400 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              @ferreiraatheone
            </a>
          </span>
        </footer>
      )}
    </div>
  );
}
