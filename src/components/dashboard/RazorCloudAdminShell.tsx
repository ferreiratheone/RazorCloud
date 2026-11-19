import React, { useState } from 'react';
import {
  CalendarDays,
  Scissors,
  Users,
  Clock,
  Settings,
  Menu,
  LogOut,
  ShieldCheck,
  Globe,
  Contact2,
  Crown,
  TrendingUp,
  ShoppingBag,
  MessageSquare,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  X,
  Lock
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import { AgendaTab } from './tabs/AgendaTab';
import { ServicesTab } from './tabs/ServicesTab';
import { ClientsTab } from './tabs/ClientsTab';
import { PlansTab } from './tabs/PlansTab';
import { TeamTab } from './tabs/TeamTab';
import { HoursTab } from './tabs/HoursTab';
import { SettingsTab } from './tabs/SettingsTab';
import { FinancialTab } from './tabs/FinancialTab';
import { ProductsTab } from './tabs/ProductsTab';
import { WhatsAppTab } from './tabs/WhatsAppTab';
import { isSupabaseConfigured } from '@/src/lib/supabase/client';
import type { Organization, UserProfile } from '@/src/types/database';

interface RazorCloudAdminShellProps {
  currentUser: UserProfile;
  organization: Organization;
  onUpdateOrg: (org: Organization) => void;
  onUpdateUser?: (user: UserProfile) => void;
  onLogout: () => void;
  onViewPublicPage: (slug: string) => void;
}

export type DashboardTab =
  | 'agenda'
  | 'financial'
  | 'services'
  | 'products'
  | 'clients'
  | 'plans'
  | 'whatsapp'
  | 'hours'
  | 'team'
  | 'settings';

export default function RazorCloudAdminShell({
  currentUser,
  organization,
  onUpdateOrg,
  onUpdateUser,
  onLogout,
  onViewPublicPage,
}: RazorCloudAdminShellProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('agenda');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Modal de Segurança e Senha do Usuário
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const isOwner = currentUser.role === 'owner' || currentUser.role === 'admin';

  // Abas principais fixas na Bottom Navigation Bar no Mobile (Polegar)
  const mobileNavTabs = isOwner ? [
    { id: 'agenda' as const, label: 'Agenda', icon: CalendarDays },
    { id: 'financial' as const, label: 'Financeiro', icon: TrendingUp },
    { id: 'services' as const, label: 'Serviços', icon: Scissors },
    { id: 'team' as const, label: 'Equipe', icon: Users },
  ] : [
    { id: 'agenda' as const, label: 'Agenda', icon: CalendarDays },
    { id: 'financial' as const, label: 'Financeiro', icon: TrendingUp },
    { id: 'hours' as const, label: 'Horários', icon: Clock },
    { id: 'services' as const, label: 'Serviços', icon: Scissors },
  ];

  const navigation = isOwner ? [
    { id: 'agenda' as const, label: 'Agenda do Dia', icon: CalendarDays },
    { id: 'financial' as const, label: 'Relatório Financeiro', icon: TrendingUp },
    { id: 'services' as const, label: 'Serviços e Preços', icon: Scissors },
    { id: 'products' as const, label: 'Produtos & Vitrine', icon: ShoppingBag },
    { id: 'clients' as const, label: 'Base de Clientes', icon: Contact2 },
    { id: 'plans' as const, label: 'Clube de Assinaturas', icon: Crown },
    { id: 'whatsapp' as const, label: 'Automação WhatsApp', icon: MessageSquare, badge: 'Em Manutenção' },
    { id: 'hours' as const, label: 'Horários & Escalas', icon: Clock },
    { id: 'team' as const, label: 'Equipe de Barbeiros', icon: Users },
    { id: 'settings' as const, label: 'Configurações do Site', icon: Settings },
  ] : [
    { id: 'agenda' as const, label: 'Minha Agenda', icon: CalendarDays },
    { id: 'financial' as const, label: 'Meu Financeiro', icon: TrendingUp },
    { id: 'plans' as const, label: 'Clube de Assinaturas', icon: Crown },
    { id: 'hours' as const, label: 'Meus Horários de Trabalho', icon: Clock },
    { id: 'services' as const, label: 'Serviços da Barbearia', icon: Scissors },
    { id: 'products' as const, label: 'Produtos & Vitrine', icon: ShoppingBag },
  ];

  function handleOpenPublicPage(slug: string) {
    if (typeof window !== 'undefined') {
      window.open(`/#/${slug}`, '_blank');
    } else {
      onViewPublicPage(slug);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const cleanPwd = newPasswordInput.trim();
    if (!cleanPwd || cleanPwd.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (!isOwner && (currentUser.password_changes_count || 0) >= 1) {
      setPasswordError('Você já utilizou sua única alteração de senha permitida. Comunique o administrador/dono para redefinição.');
      return;
    }

    setIsSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await DataService.barberChangePassword(cleanPwd);
      if (res.success) {
        setPasswordSuccess('Senha alterada com sucesso!');
        const updatedUser: UserProfile = {
          ...currentUser,
          access_password: cleanPwd,
          password_changes_count: isOwner ? (currentUser.password_changes_count || 0) : ((currentUser.password_changes_count || 0) + 1),
        };
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        setNewPasswordInput('');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordSuccess(null);
        }, 1500);
      } else {
        setPasswordError(res.error || 'Não foi possível alterar a senha.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Erro ao processar alteração.');
    } finally {
      setIsSavingPassword(false);
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'agenda':
        return (
          <AgendaTab
            organization={organization}
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onViewPublicPage={handleOpenPublicPage}
          />
        );
      case 'financial':
        return <FinancialTab organization={organization} currentUser={currentUser} />;
      case 'services':
        return <ServicesTab organization={organization} />;
      case 'products':
        return <ProductsTab organization={organization} onUpdateOrg={onUpdateOrg} />;
      case 'clients':
        return isOwner ? <ClientsTab organization={organization} /> : null;
      case 'plans':
        return <PlansTab organization={organization} onUpdateOrg={onUpdateOrg} currentUser={currentUser} />;
      case 'whatsapp':
        return isOwner ? <WhatsAppTab organization={organization} onUpdateOrg={onUpdateOrg} /> : null;
      case 'team':
        return isOwner ? <TeamTab organization={organization} /> : null;
      case 'hours':
        return <HoursTab organization={organization} currentUser={currentUser} />;
      case 'settings':
        return isOwner ? (
          <SettingsTab
            organization={organization}
            onUpdateOrg={onUpdateOrg}
            onViewPublicPage={handleOpenPublicPage}
          />
        ) : null;
      default:
        return (
          <AgendaTab
            organization={organization}
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onViewPublicPage={handleOpenPublicPage}
          />
        );
    }
  };

  const supabaseConnected = isSupabaseConfigured();

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden text-zinc-50 font-sans selection:bg-zinc-800 selection:text-white">

      {/* SIDEBAR FIXA (DESKTOP E MOBILE DRAWER) */}
      <aside className={`fixed h-screen w-64 z-40 bg-[#0a0a0a] border-r border-zinc-800 flex flex-col transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-transform duration-300 ease-in-out shrink-0`}>
        {/* Logo / Header B2B */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#121212] border border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src="/logo.webp"
                alt="Fratres Barbearia Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-tight">Fratres Barbearia</span>
              <span className="text-[10px] text-zinc-400 font-medium block leading-none truncate max-w-[130px]">
                Painel Administrativo
              </span>
            </div>
          </div>
          <button className="md:hidden ml-auto text-zinc-400 p-1" onClick={() => setIsMobileMenuOpen(false)}>
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Links de Navegação do Painel */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 mt-2">Gestão do Salão</p>
          {navigation.map((item) => (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left
                ${activeTab === item.id
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121212] border border-transparent'
                }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id
                ? (item.id === 'plans'
                  ? 'text-amber-400'
                  : item.id === 'financial'
                    ? 'text-emerald-400'
                    : item.id === 'products'
                      ? 'text-purple-400'
                      : 'text-white')
                : 'text-zinc-500 group-hover:text-zinc-400'
                }`} />
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-xs truncate">{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-bold shrink-0 ml-1">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          ))}

          <div className="pt-6 px-3">
            <div className="p-3 bg-[#121212] border border-zinc-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sistema Online & Seguro</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                {supabaseConnected
                  ? 'Sincronização em Nuvem Ativa'
                  : 'Modo Offline Local'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Perfil do Dono / Footer */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 p-2 bg-[#121212] rounded-xl border border-zinc-800">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-9 h-9 rounded-lg object-cover aspect-square"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                {currentUser.full_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser.full_name}</p>
              <p className="text-[10px] text-zinc-400 truncate capitalize">{currentUser.role === 'owner' ? 'Proprietário' : 'Barbeiro'}</p>
            </div>
            <button
              onClick={() => {
                setPasswordError(null);
                setPasswordSuccess(null);
                setNewPasswordInput('');
                setShowCurrentPassword(false);
                setShowNewPassword(false);
                setIsPasswordModalOpen(true);
              }}
              title="Minha Senha & Segurança"
              className="p-1.5 text-zinc-400 hover:text-emerald-400 transition-colors rounded-lg hover:bg-zinc-800"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              title="Encerrar sessão"
              className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ÁREA DE CONTEÚDO (SCROLL CONDICIONAL COM OVERFLOW-Y-AUTO) */}
      <main className="flex-1 h-screen overflow-y-auto p-4 md:ml-64 md:p-8 bg-[#0a0a0a] text-white">

        {/* Topbar Permanente e Estável */}
        <header className="h-16 flex items-center justify-between pb-4 sm:pb-6 border-b border-zinc-800 mb-6 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="md:hidden p-2 text-zinc-300 hover:text-white bg-[#121212] border border-zinc-800 rounded-xl shrink-0"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              {navigation.find(n => n.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenPublicPage(organization.slug)}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 bg-[#121212] hover:bg-zinc-800 border border-zinc-800 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-colors shadow-sm shrink-0"
              title="Abrir a vitrine do cliente em uma nova aba"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Ver Vitrine do Cliente</span>
              <span className="sm:hidden text-[11px]">Vitrine</span>
            </button>
          </div>
        </header>

        {/* Conteúdo Dinâmico */}
        <div className="w-full max-w-6xl mx-auto pb-12">
          {renderContent()}
        </div>

      </main>

      {/* Modal de Segurança e Senha de Acesso */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Minha Conta & Senha</h3>
                  <p className="text-xs text-zinc-400">
                    {currentUser.full_name} • <span className="capitalize">{currentUser.role === 'owner' ? 'Proprietário' : 'Barbeiro'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visualização da Senha Atual com o Olho */}
            <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2">
              <label className="text-xs text-zinc-400 font-medium block">
                Sua Senha Atual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  readOnly
                  value={currentUser.access_password || '••••••••'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white focus:outline-none font-mono tracking-wider cursor-default"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-white p-0.5 transition-colors"
                  title={showCurrentPassword ? "Ocultar senha" : "Ver senha atual"}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                {showCurrentPassword ? '👁️ Sua senha atual está visível.' : 'Clique no olho acima para visualizar sua senha atual.'}
              </p>
            </div>

            {/* Mensagens de Sucesso ou Erro */}
            {passwordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* Bloco de Regra: Barbeiro que já alterou 1 vez */}
            {!isOwner && (currentUser.password_changes_count || 0) >= 1 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">Limite de Alteração Atingido (1/1)</h4>
                    <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                      Você já realizou sua alteração de senha permitida pelo sistema. Caso tenha esquecido ou precise de uma nova senha, comunique o <strong>administrador/dono da barbearia</strong> para que ele redefina seu acesso.
                    </p>
                  </div>
                </div>

                {organization.phone && (
                  <a
                    href={`https://wa.me/55${organization.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Olá! Sou o barbeiro ${currentUser.full_name} da Fratres Barbearia. Preciso que você redefina minha senha de acesso ao painel, pois já utilizei minha alteração permitida.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" /> Solicitar Redefinição ao Dono no WhatsApp
                  </a>
                )}
              </div>
            ) : (
              /* Formulário de Alteração de Senha (Dono ou Barbeiro com 0 alterações) */
              <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400 font-medium">Definir Nova Senha</label>
                    {!isOwner && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                        1 alteração disponível
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white p-0.5 transition-colors"
                      title={showNewPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isOwner && (
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                      ⚠️ Atenção: você só consegue alterar esta senha <strong>1 vez</strong>. Se esquecer a próxima vez, precisará pedir ao administrador/dono para redefinir.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs py-2.5 rounded-xl transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPassword || !newPasswordInput.trim()}
                    className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSavingPassword ? 'Salvando...' : 'Confirmar Nova Senha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
