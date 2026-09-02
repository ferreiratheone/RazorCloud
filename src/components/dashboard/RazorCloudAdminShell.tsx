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
  Crown
} from 'lucide-react';
import { AgendaTab } from './tabs/AgendaTab';
import { ServicesTab } from './tabs/ServicesTab';
import { ClientsTab } from './tabs/ClientsTab';
import { PlansTab } from './tabs/PlansTab';
import { TeamTab } from './tabs/TeamTab';
import { HoursTab } from './tabs/HoursTab';
import { SettingsTab } from './tabs/SettingsTab';
import { isSupabaseConfigured } from '@/src/lib/supabase/client';
import type { Organization, UserProfile } from '@/src/types/database';

interface RazorCloudAdminShellProps {
  currentUser: UserProfile;
  organization: Organization;
  onUpdateOrg: (org: Organization) => void;
  onLogout: () => void;
  onViewPublicPage: (slug: string) => void;
}

export default function RazorCloudAdminShell({
  currentUser,
  organization,
  onUpdateOrg,
  onLogout,
  onViewPublicPage,
}: RazorCloudAdminShellProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'services' | 'clients' | 'plans' | 'team' | 'hours' | 'settings'>('agenda');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'agenda' as const, label: 'Agenda do Dia', icon: CalendarDays },
    { id: 'services' as const, label: 'Serviços e Preços', icon: Scissors },
    { id: 'clients' as const, label: 'Base de Clientes', icon: Contact2 },
    { id: 'plans' as const, label: 'Clube de Assinaturas', icon: Crown },
    { id: 'hours' as const, label: 'Horários da Barbearia', icon: Clock },
    { id: 'team' as const, label: 'Equipe de Barbeiros', icon: Users },
    { id: 'settings' as const, label: 'Configurações do Site', icon: Settings },
  ];

  function handleOpenPublicPage(slug: string) {
    if (typeof window !== 'undefined') {
      window.open(`/#/${slug}`, '_blank');
    } else {
      onViewPublicPage(slug);
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'agenda':
        return (
          <AgendaTab 
            organization={organization} 
            onNavigateTab={(tab) => setActiveTab(tab)}
            onViewPublicPage={handleOpenPublicPage}
          />
        );
      case 'services':
        return <ServicesTab organization={organization} />;
      case 'clients':
        return <ClientsTab organization={organization} />;
      case 'plans':
        return <PlansTab organization={organization} onUpdateOrg={onUpdateOrg} />;
      case 'team':
        return <TeamTab organization={organization} />;
      case 'hours':
        return <HoursTab organization={organization} />;
      case 'settings':
        return (
          <SettingsTab 
            organization={organization} 
            onUpdateOrg={onUpdateOrg} 
            onViewPublicPage={handleOpenPublicPage} 
          />
        );
      default:
        return (
          <AgendaTab 
            organization={organization} 
            onNavigateTab={(tab) => setActiveTab(tab)}
            onViewPublicPage={handleOpenPublicPage}
          />
        );
    }
  };

  const supabaseConnected = isSupabaseConfigured();

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800 selection:text-white overflow-hidden">
      
      {/* SIDEBAR (DESKTOP) */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800/80 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col h-full shrink-0`}>
        {/* Logo / Header B2B */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
              <img 
                src="/razorcloud.webp" 
                alt="RazorCloud Logo" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-tight">RazorCloud</span>
              <span className="text-[10px] text-zinc-400 font-medium block leading-none truncate max-w-[130px]">
                {organization.name}
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
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? (item.id === 'plans' ? 'text-amber-400' : 'text-white') : 'text-zinc-500 group-hover:text-zinc-400'}`} />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}

          <div className="pt-6 px-3">
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1">
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
        <div className="p-4 border-t border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ÁREA PRINCIPAL FIXA */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] bg-zinc-950 overflow-hidden">
        
        {/* Topbar Permanente e Estável */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800 rounded-xl"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-bold text-white">
              {navigation.find(n => n.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => handleOpenPublicPage(organization.slug)}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 rounded-xl transition-colors shadow-sm"
              title="Abrir a vitrine do cliente em uma nova aba"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" /> 
              <span className="hidden sm:inline">Ver Vitrine do Cliente</span>
              <span className="sm:hidden">Vitrine</span>
            </button>
          </div>
        </header>

        {/* Conteúdo com Scroll Próprio */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8">
          <div className="max-w-5xl mx-auto pb-12">
            {renderContent()}
          </div>
        </div>

      </main>
    </div>
  );
}
