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
import { PwaInstallButton } from '@/src/components/pwa/PwaInstallModal';
import type { Organization, UserProfile } from '@/src/types/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: UserProfile, org: Organization) => void;
  isFullPage?: boolean;
}

const STORAGE_KEY = 'fratres_saved_auth';

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

  // Modal de Recuperação / Alteração de Senha
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCurrentPassword, setResetCurrentPassword] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetCurrentPwd, setShowResetCurrentPwd] = useState(false);
  const [showResetNewPwd, setShowResetNewPwd] = useState(false);
  const [resetStep, setResetStep] = useState<'input_email' | 'limit_reached' | 'change_password'>('input_email');
  const [resetOwnerInfo, setResetOwnerInfo] = useState<{ name: string; phone: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Carregar credenciais salvas no dispositivo ao carregar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('razorcloud_saved_auth');
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
        localStorage.removeItem('razorcloud_saved_auth');
      } catch (e) { }
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
      } catch (e) { }
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
      } catch (e) { }
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

  async function handleCheckEligibility(e: React.FormEvent) {
    e.preventDefault();
    const cleanMail = resetEmail.trim();
    if (!cleanMail) return;

    setResetLoading(true);
    setResetError(null);

    try {
      const res = await DataService.checkUserPasswordChangeEligibility(cleanMail);
      if (!res.found) {
        setResetError('Nenhuma conta encontrada com este e-mail.');
        return;
      }

      if (!res.can_change) {
        setResetOwnerInfo({
          name: res.owner_name || 'Administrador',
          phone: res.owner_phone || '',
        });
        setResetStep('limit_reached');
      } else {
        setResetStep('change_password');
      }
    } catch (err: any) {
      setResetError(err.message || 'Erro ao verificar conta.');
    } finally {
      setResetLoading(false);
    }
  }

  async function handleConfirmPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!resetNewPassword.trim() || resetNewPassword.trim().length < 6) {
      setResetError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      if (isSupabaseConfigured()) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: resetEmail.trim(),
          password: resetCurrentPassword,
        });

        if (signInErr) {
          throw new Error('A senha atual digitada está incorreta.');
        }

        const changeRes = await DataService.barberChangePassword(resetNewPassword.trim());
        if (!changeRes.success) {
          throw new Error(changeRes.error || 'Falha ao salvar nova senha.');
        }

        setResetSuccess('Senha alterada com sucesso! Você já pode entrar com sua nova senha.');
        setEmail(resetEmail.trim());
        setPassword(resetNewPassword.trim());
        setTimeout(() => {
          setShowResetModal(false);
          setResetSuccess(null);
        }, 1800);
      }
    } catch (err: any) {
      setResetError(err.message || 'Erro ao alterar senha.');
    } finally {
      setResetLoading(false);
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
            name: 'Fratres Barbearia',
            slug: 'fratresbarbearia',
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
          organization_id: '02f3cc71-2747-496b-a241-20dfbae56d32',
          full_name: 'Thierry (Fratres Barbearia)',
          role: 'owner',
          email: email.trim() || 'sthierry342@gmail.com',
          active: true,
        };
        const org: Organization = {
          id: '02f3cc71-2747-496b-a241-20dfbae56d32',
          name: 'Fratres Barbearia',
          slug: 'fratresbarbearia',
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
    ? "min-h-screen w-full bg-zinc-950 text-zinc-50 flex flex-col items-center justify-between p-4 sm:p-8 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    : "fixed inset-x-0 bottom-0 sm:inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4";

  return (
    <div className={containerClasses}>
      <div className="bg-zinc-900/98 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-auto overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">

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
                className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <Check className="w-4 h-4" /> Sim, salvar senha neste dispositivo
              </button>

              <button
                type="button"
                onClick={handleDismissSavePassword}
                className="w-full min-h-[44px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-colors active:scale-95"
              >
                Agora não
              </button>
            </div>
          </div>
        )}

        {/* MODAL SOBREPOSTO: ALTERAR OU RECUPERAR SENHA (COM REGRA DE 1 VEZ) */}
        {showResetModal && (
          <div className="absolute inset-0 bg-zinc-950/98 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between z-30 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>Alterar Senha</span>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-3 my-auto">
              {resetError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {/* Etapa 1: Digitar o e-mail cadastrado */}
              {resetStep === 'input_email' && (
                <form onSubmit={handleCheckEligibility} className="space-y-3.5">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Informe seu e-mail cadastrado para verificar a permissão de alteração de senha:
                  </p>
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold block mb-1.5">E-mail Cadastrado</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="seuemail@barbearia.com"
                        className="w-full min-h-[48px] bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading || !resetEmail.trim()}
                    className="w-full min-h-[48px] bg-white text-zinc-950 hover:bg-zinc-200 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 active:scale-95"
                  >
                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar Permissão'}
                  </button>
                </form>
              )}

              {/* Etapa 2A: Limite de 1 alteração atingido -> Comunicar o Administrador/Dono */}
              {resetStep === 'limit_reached' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Limite de Alteração Atingido</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed">
                      Você já realizou sua <strong>1 alteração permitida</strong> pelo sistema. Por motivos de segurança, caso tenha esquecido sua senha, você deve <strong>comunicar o administrador/dono da barbearia</strong> para redefini-la.
                    </p>
                  </div>

                  {resetOwnerInfo?.phone ? (
                    <a
                      href={`https://wa.me/55${resetOwnerInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá ${resetOwnerInfo.name}! Sou da equipe da Fratres Barbearia e preciso que você redefina minha senha de acesso ao painel (${resetEmail}), pois já utilizei minha alteração permitida.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" /> Solicitar Redefinição no WhatsApp
                    </a>
                  ) : (
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                      <p className="text-xs text-zinc-400">
                        Por favor, fale com o proprietário da barbearia para redefinir sua senha.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('input_email');
                      setResetError(null);
                    }}
                    className="w-full min-h-[44px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-xs py-2 rounded-xl transition-colors active:scale-95"
                  >
                    Tentar outro e-mail
                  </button>
                </div>
              )}

              {/* Etapa 2B: Permissão válida -> Definir nova senha (1 vez) */}
              {resetStep === 'change_password' && (
                <form onSubmit={handleConfirmPasswordChange} className="space-y-3">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 leading-relaxed">
                    ✓ Permissão confirmada! Você pode alterar sua senha <strong>1 vez</strong>. Se esquecer a próxima vez, precisará pedir ao dono.
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">Senha Atual ou Provisória</label>
                    <div className="relative">
                      <input
                        type={showResetCurrentPwd ? 'text' : 'password'}
                        required
                        value={resetCurrentPassword}
                        onChange={(e) => setResetCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                        className="w-full min-h-[48px] bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-10 py-2.5 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetCurrentPwd(!showResetCurrentPwd)}
                        className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"
                      >
                        {showResetCurrentPwd ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">Nova Senha Desejada</label>
                    <div className="relative">
                      <input
                        type={showResetNewPwd ? 'text' : 'password'}
                        required
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full min-h-[48px] bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-10 py-2.5 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPwd(!showResetNewPwd)}
                        className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"
                      >
                        {showResetNewPwd ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading || !resetNewPassword.trim()}
                    className="w-full min-h-[48px] bg-white text-zinc-950 hover:bg-zinc-200 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 active:scale-95"
                  >
                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Nova Senha'}
                  </button>
                </form>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 text-center">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Voltar para a tela de login
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

        {/* Header Fratres Barbearia */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3 shadow-xl">
            <img
              src="/logo.webp"
              alt="Fratres Barbearia"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Fratres Barbearia</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Painel restrito para barbeiros e administração
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
                className="w-full min-h-[48px] bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-zinc-400 font-semibold block mb-1.5">Senha de Acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
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
                className="w-full min-h-[48px] bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-12 py-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors active:scale-90"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Opção de Lembrar Senha & Esqueci Senha */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2.5 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none py-1.5">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
              />
              <span className="text-xs sm:text-sm">Lembrar dados</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setResetEmail(email.trim());
                setResetCurrentPassword('');
                setResetNewPassword('');
                setResetStep('input_email');
                setResetError(null);
                setResetSuccess(null);
                setShowResetModal(true);
              }}
              className="text-xs sm:text-sm text-zinc-400 hover:text-emerald-400 transition-colors underline py-1.5"
            >
              Alterar / Esqueci senha
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-white text-zinc-950 hover:bg-zinc-200 font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4 active:scale-[0.98]"
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

        {/* Botão de Instalação do App para a Equipe */}
        <div className="mt-4">
          <PwaInstallButton variant="default" className="w-full justify-center min-h-[44px]" />
        </div>

        {/* Seção de Suporte à Equipe Fratres */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 space-y-3">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Suporte & Equipe
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Dúvidas sobre o seu acesso?</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Caso você faça parte da equipe Fratres Barbearia e precise de suporte ou novo acesso, contate a administração.
              </p>
            </div>
            <a
              href="https://wa.me/5519981704277?text=Ol%C3%A1!%20Sou%20da%20equipe%20da%20Fratres%20Barbearia%20e%20preciso%20de%20ajuda%20com%20meu%20acesso%20ao%20painel."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com o Administrador no WhatsApp
            </a>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Fratres Barbearia • Painel Administrativo</span>
          </div>
        </div>

      </div>

      {isFullPage && (
        <footer className="w-full text-center pt-6 pb-2 text-[11px] text-zinc-500 flex flex-wrap items-center justify-center gap-2">
          <span>Fratres Barbearia • Todos os direitos reservados</span>
          <span className="text-zinc-700">•</span>
          <a href="/#/" className="text-zinc-400 hover:text-white transition-colors underline">
            Ir para Agendamento de Clientes
          </a>
        </footer>
      )}
    </div>
  );
}
