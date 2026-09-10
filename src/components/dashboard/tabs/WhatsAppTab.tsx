import React from 'react';
import { 
  MessageSquare, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Share2, 
  ShieldAlert, 
  Sparkles, 
  Send
} from 'lucide-react';
import type { Organization } from '@/src/types/database';

interface WhatsAppTabProps {
  organization: Organization;
  onUpdateOrg: (org: Organization) => void;
}

export function WhatsAppTab({ organization }: WhatsAppTabProps) {
  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      
      {/* Banner Principal de Manutenção */}
      <div className="bg-gradient-to-r from-amber-500/15 via-zinc-900/80 to-zinc-900 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
              <Wrench className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Automação WhatsApp via API Externa
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Em Manutenção
                </span>
              </div>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                O módulo de disparos automáticos via gateways pagos (como Z-API / Evolution API) está temporariamente em manutenção para reestruturação e busca de opções mais acessíveis para o sistema.
              </p>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-xl text-center self-start sm:self-auto shrink-0">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Status do Módulo</span>
            <span className="text-xs font-bold text-amber-400">Pausado para Manutenção</span>
          </div>
        </div>
      </div>

      {/* Caixa de Esclarecimento sobre os Recursos Gratuitos Ativos */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="w-4 h-4" />
          <h4 className="text-sm font-bold text-white">
            Seus Lembretes e Comprovantes pelo WhatsApp Continuam 100% Ativos e Gratuitos!
          </h4>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Você <strong>não precisa investir em chaves de API pagas</strong> agora. O RazorCloud já possui recursos nativos integrados ao WhatsApp que funcionam diretamente no seu celular ou WhatsApp Web sem custo algum:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {/* Recurso 1: Comprovante de Agendamento */}
          <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Share2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-white">Comprovante Instantâneo do Cliente</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Ao concluir o agendamento no seu site, o cliente visualiza o botão <strong>"Enviar Comprovante no WhatsApp"</strong> com todos os serviços, valor e horário já formatados para enviar ao número da sua barbearia.
            </p>
            <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              ✓ 100% Gratuito (Sem API)
            </span>
          </div>

          {/* Recurso 2: Lembretes Manuais na Agenda */}
          <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Send className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-white">Disparo de Lembrete na Agenda</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Na aba <strong>Minha Agenda / Agenda Geral</strong>, cada horário agendado possui um botão direto de WhatsApp. Com 1 toque, abre o chat com o cliente com o lembrete pronto para enviar.
            </p>
            <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              ✓ 100% Gratuito (Sem API)
            </span>
          </div>
        </div>
      </div>

      {/* Prévia das Mensagens Padrão (Bloqueada em Manutenção) */}
      <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-5 sm:p-7 space-y-5 opacity-80">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" /> Modelos de Mensagem do Sistema
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Estes são os modelos de mensagem que o sistema utiliza ao gerar links de WhatsApp para os clientes.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
            Bloqueado em Manutenção
          </span>
        </div>

        <div className="space-y-4 text-xs">
          {/* Mensagem 1 */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-medium block">Mensagem de Confirmação:</label>
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-400 font-mono text-[11px] leading-relaxed">
              Fala {'{cliente}'}! Seu agendamento foi confirmado para {'{data}'} às {'{horario}'} na {organization.name}. Te esperamos! ✂️
            </div>
          </div>

          {/* Mensagem 2 */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-medium block">Mensagem de Lembrete de Horário:</label>
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-400 font-mono text-[11px] leading-relaxed">
              Fala {'{cliente}'}! Passando para lembrar que seu corte está marcado para hoje às {'{horario}'} na {organization.name}. Até logo! 💈
            </div>
          </div>

          <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-500 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Nenhuma cobrança de API ou taxa será gerada enquanto o módulo estiver em manutenção.</span>
          </div>
        </div>
      </div>

    </div>
  );
}
