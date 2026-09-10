import React, { useState, useEffect } from 'react';
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
  EyeOff,
  KeyRound,
  Check,
  Sparkles
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

const STORAGE_KEY = 'razorcloud_saved_auth';

export function AuthModal({ isOpen, onClose, onSuccess, isFullPage = false }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal / Prompt de confirmação para salvar a senha
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ user: UserProfile; org: Organization } | null>(null);

  // Carregar credenciais salvas no dispositivo ao carregar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.email && parsed?.password) {
            setEmail(parsed.email);
            setPassword(parsed.password);
            setHasSavedCredentials(true);
          }
        }
      } catch (e) {
        console.warn('Erro ao ler credenciais salvas:', e);
      }
    }
  }, []);

  if (!isOpen) return null;

  function handleForgetCredentials() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
    setEmail('');
    setPassword('');
    setHasSavedCredentials(false);
  }

  function handleConfirmSavePassword() {
    if (typeof window !== 'undefined' && pendingAuth) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          email: email.trim(),
          password,
          savedAt: new Date().toISOString(),
        }));
      } catch (e) {}
    }
    setShowSavePrompt(false);
    if (pendingAuth) {
      onSuccess(pendingAuth.user, pendingAuth.org);
      if (onClose) onClose();
    }
  }

  function handleDismissSavePassword() {
    setShowSavePrompt(false);
    if (pendingAuth) {
      onSuccess(pendingAuth.user, pendingAuth.org);
      if (onClose) onClose();
    }
  }

  function finishLogin(user: UserProfile, org: Organization) {
    let alreadySaved = false;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.email === email.trim() && parsed?.password === password) {
            alreadySaved = true;
          }
        }
      } catch (e) {}
    }

    if (alreadySaved) {
      // Se a senha já estava salva e inalterada, entra direto sem perguntar de novo
      onSuccess(user, org);
      if (onClose) onClose();
    } else if (rememberDevice) {
      // Abre o diálogo perguntando se deseja salvar a senha neste dispositivo
      setPendingAuth({ user, org });
      setShowSavePrompt(true);
    } else {
      onSuccess(user, org);
      if (onClose) onClose();
    }
  }

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
            finishLogin(user, organization);
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
          finishLogin(fallbackUser, fallbackOrg);
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
        finishLogin(user, org);
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
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-auto overflow-hidden">
        
        {/* MODAL SOBREPOSTO: DESEJA SALVAR SUA SENHA? */}
        {showSavePrompt && pendingAuth && (
          <div className="absolute inset-0 bg-zinc-950/98 backdrop-blur-md rounded-3xl p-6 sm:p-8 flex flex-col justify-between z-30 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center my-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <KeyRound className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Deseja salvar sua senha?</h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Ao salvar sua senha neste aparelho, você e os barbeiros entram direto no painel sem precisar digitar tudo novamente.
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Conta conectada</p>
                  <p className="text-xs text-white font-medium truncate">{email.trim()}</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Pronto
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <button
                type="button"
                onClick={handleConfirmSavePassword}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Check className="w-4 h-4" /> Sim, salvar senha neste dispositivo
              </button>

              <button
                type="button"
                onClick={handleDismissSavePassword}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        )}

        {/* Botão Fechar (apenas se for modal flutuante) */}
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

        {/* Banner Indicador de Credenciais Salvas */}
        {hasSavedCredentials && (
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-xs text-emerald-400 mb-4">
            <span className="flex items-center gap-1.5 font-medium">
              <KeyRound className="w-3.5 h-3.5 shrink-0" /> Senha salva neste dispositivo
            </span>
            <button
              type="button"
              onClick={handleForgetCredentials}
              className="text-[11px] text-zinc-400 hover:text-white underline transition-colors shrink-0 ml-2"
              title="Apagar dados salvos deste aparelho"
            >
              Trocar de conta
            </button>
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário de Login Seguro com AutoComplete nativo */}
        <form onSubmit={handleLogin} autoComplete="on" className="space-y-3.5">
          <div>
            <label className="text-xs text-zinc-400 font-semibold block mb-1">E-mail Cadastrado</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input 
                name="email"
                type="email" 
                required
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (hasSavedCredentials) setHasSavedCredentials(false);
                }}
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
                name="password"
                type={showPassword ? 'text' : 'password'} 
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (hasSavedCredentials) setHasSavedCredentials(false);
                }}
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

          {/* Opção de Lembrar Senha */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
              />
              <span>Lembrar meus dados de acesso</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-3"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Acessando...</>
            ) : hasSavedCredentials ? (
              <>Entrar com Senha Salva <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Entrar no Painel <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Seção Comercial: Solicitar Acesso / Teste Grátis / Suporte */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 space-y-3">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
              <Sparkles className="w-3 h-3" /> Teste Grátis ou Desbloqueio
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Não possui conta ou quer testar?</h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Fale com nosso suporte para liberar um login de demonstração ou desbloquear o sistema para sua barbearia.
              </p>
            </div>
            <a
              href="https://wa.me/?text=Ol%C3%A1!%20Acessei%20o%20link%20do%20RazorCloud%20e%20gostaria%20de%20solicitar%20um%20login%20de%20teste%20%2F%20desbloquear%20o%20sistema%20para%20minha%20barbearia."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-950/30"
            >
              <MessageCircle className="w-4 h-4" />
              Solicitar Teste / Suporte no WhatsApp
            </a>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Acesso protegido com isolamento por barbearia</span>
          </div>
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
