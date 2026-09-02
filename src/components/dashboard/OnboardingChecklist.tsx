import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink,
  Globe
} from 'lucide-react';
import type { Organization, Service, UserProfile, Schedule } from '@/src/types/database';

interface OnboardingChecklistProps {
  organization: Organization;
  services: Service[];
  team: UserProfile[];
  schedules: Schedule[];
  onNavigateTab: (tab: 'services' | 'team' | 'hours' | 'settings') => void;
  onViewPublicPage: (slug: string) => void;
}

export function OnboardingChecklist({
  organization,
  services,
  team,
  schedules,
  onNavigateTab,
  onViewPublicPage,
}: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // 4 Passos Essenciais do Onboarding
  const hasServices = services.length > 0;
  const hasHours = schedules.length > 0 && schedules.some(s => !s.is_closed);
  const hasInfo = Boolean(organization.address || organization.phone || organization.logo_url);
  const hasTeam = team.length > 0;

  const steps = [
    {
      id: 'services',
      title: 'Cadastrar Serviços & Preços',
      description: 'Adicione os tipos de corte, barba e valores do seu catálogo.',
      completed: hasServices,
      tab: 'services' as const,
    },
    {
      id: 'hours',
      title: 'Configurar Horários de Atendimento',
      description: 'Defina os dias e turnos em que sua barbearia estará aberta.',
      completed: hasHours,
      tab: 'hours' as const,
    },
    {
      id: 'settings',
      title: 'Personalizar Identidade da Barbearia',
      description: 'Defina o nome, WhatsApp, endereço e logo do salão.',
      completed: hasInfo,
      tab: 'settings' as const,
    },
    {
      id: 'team',
      title: 'Definir Equipe / Barbeiros',
      description: 'Cadastre os profissionais que atendem na barbearia.',
      completed: hasTeam,
      tab: 'team' as const,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const isAllDone = completedCount === steps.length;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://razorcloud.vercel.app';
  const publicUrl = `${originUrl}/#/${organization.slug}`;
  const shareText = `💈 *Agende seu horário na ${organization.name}!*\n\nEscolha o serviço, barbeiro e horário de forma rápida pelo nosso site oficial:\n👉 ${publicUrl}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyWhatsAppMessage() {
    navigator.clipboard.writeText(shareText);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  }

  return (
    <div className="space-y-3 mb-6 max-w-full overflow-hidden">
      {/* BARRA FIXA PRINCIPAL DO LINK OFICIAL DA BARBEARIA */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-full overflow-hidden">
        <div className="flex items-center gap-3 min-w-0 max-w-full">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white truncate">Link Oficial da Barbearia</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                Online
              </span>
            </div>
            <code className="text-xs text-zinc-400 font-mono block truncate max-w-full mt-0.5">
              {publicUrl}
            </code>
          </div>
        </div>

        {/* Botões de Ação Responsivos */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleCopyLink}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors shadow-sm shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </button>

          <button
            onClick={handleCopyWhatsAppMessage}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-colors shadow-sm shrink-0"
          >
            {copiedMsg ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedMsg ? 'Copiado!' : 'Copiar p/ WhatsApp'}
          </button>

          <button
            onClick={() => onViewPublicPage(organization.slug)}
            className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-colors shrink-0"
            title="Abrir vitrine como cliente em nova aba"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Botão de recolher/expandir o guia só aparece enquanto ainda houver pendências */}
          {!isAllDone && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/60 rounded-xl transition-colors text-xs flex items-center gap-1 shrink-0"
              title={isExpanded ? 'Ocultar Guia' : 'Ver Checklist'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* GUIA DE INÍCIO RÁPIDO: Some 100% assim que os 4 passos forem concluídos! */}
      {!isAllDone && isExpanded && (
        <div className="bg-gradient-to-b from-zinc-900/60 to-zinc-900/20 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 animate-in fade-in duration-200 max-w-full overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Passos de Configuração do Salão</h3>
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {completedCount} de {steps.length} concluídos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                  step.completed 
                    ? 'bg-zinc-950/40 border-zinc-800/60' 
                    : 'bg-zinc-900/80 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className={`text-xs font-semibold ${step.completed ? 'text-zinc-400 line-through decoration-zinc-600' : 'text-white'}`}>
                      {step.title}
                    </h4>
                    <button
                      onClick={() => onNavigateTab(step.tab)}
                      className="text-[10px] font-bold text-zinc-300 hover:text-white flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded-md border border-zinc-700 transition-colors shrink-0"
                    >
                      {step.completed ? 'Editar' : 'Configurar'} <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
