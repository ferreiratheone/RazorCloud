import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Scissors, 
  Users, 
  Clock, 
  Settings, 
  Bell, 
  Menu, 
  LogOut,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';
import { AgendaTab } from './tabs/AgendaTab';
import { ServicesTab } from './tabs/ServicesTab';
import { TeamTab } from './tabs/TeamTab';
import { HoursTab } from './tabs/HoursTab';
import { SettingsTab } from './tabs/SettingsTab';
import { DataService } from '@/src/lib/data-service';
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
  const [activeTab, setActiveTab] = useState<'agenda' | 'services' | 'team' | 'hours' | 'settings'>('agenda');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'agenda' as const, label: 'Agenda de Hoje', icon: CalendarDays },
    { id: 'services' as const, label: 'Serviços e Preços', icon: Scissors },
    { id: 'team' as const, label: 'Profissionais (Equipe)', icon: Users },
    { id: 'hours' as const, label: 'Horários', icon: Clock },
    { id: 'settings' as const, label: 'Configurações', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'agenda':
        return <AgendaTab organization={organization} onNavigateToServices={() => setActiveTab('services')} />;
      case 'services':
        return <ServicesTab organization={organization} />;
      case 'team':
        return <TeamTab organization={organization} />;
      case 'hours':
        return <HoursTab organization={organization} />;
      case 'settings':
        return (
          <SettingsTab 
            organization={organization} 
            onUpdateOrg={onUpdateOrg} 
            onViewPublicPage={onViewPublicPage} 
          />
        );
      default:
        return <AgendaTab organization={organization} />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800 selection:text-white overflow-hidden">
      
      {/* SIDEBAR (DESKTOP) */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800/60 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Logo / Header da Sidebar */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-zinc-100" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-tight">RazorCloud</span>
              <span className="text-[10px] text-zinc-500 font-mono block leading-none truncate max-w-[130px]">{organization.name}</span>
            </div>
          </div>
          {/* Close mobile menu */}
          <button className="md:hidden ml-auto text-zinc-400" onClick={() => setIsMobileMenuOpen(false)}>
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-2">Gestão do Salão</p>
          {navigation.map((item) => (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left
                ${activeTab === item.id 
                  ? 'bg-zinc-800/90 text-white font-semibold shadow-sm border border-zinc-700/60' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}

          <div className="pt-6 px-3">
            <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <Shield className="w-3.5 h-3.5" /> Supabase RLS Ativo
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Dados isolados pelo Tenant ID <code className="text-zinc-400 font-mono truncate">{organization.id.substring(0, 8)}...</code>
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
            {currentUser.avatar_url ? (
              <img 
                src={currentUser.avatar_url} 
                alt={currentUser.full_name} 
                width={36}
                height={36}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-lg object-cover aspect-square" 
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                {currentUser.full_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser.full_name}</p>
              <p className="text-[10px] text-zinc-500 truncate capitalize">{currentUser.role === 'owner' ? 'Dono da Barbearia' : 'Barbeiro'}</p>
            </div>
            <button 
              onClick={onLogout}
              title="Encerrar sessão"
              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY PARA MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        
        {/* Header Superior (Topbar) */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-base font-bold text-white hidden sm:block">
              {navigation.find(n => n.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => onViewPublicPage(organization.slug)}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3.5 py-2 rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver Vitrine do Cliente
            </button>
          </div>
        </header>

        {/* Área Rolável Dinâmica */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </div>

      </main>
    </div>
  );
}
