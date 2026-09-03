import React, { useState } from 'react';
import { 
  MessageSquare, 
  Power, 
  QrCode, 
  Send, 
  CheckCircle2, 
  Clock, 
  Key, 
  ExternalLink, 
  AlertCircle, 
  Sparkles, 
  Loader2 
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization } from '@/src/types/database';

interface WhatsAppTabProps {
  organization: Organization;
  onUpdateOrg: (org: Organization) => void;
}

export function WhatsAppTab({ organization, onUpdateOrg }: WhatsAppTabProps) {
  const [enabled, setEnabled] = useState(organization.whatsapp_auto_enabled || false);
  const [instanceId, setInstanceId] = useState(organization.whatsapp_api_instance || '');
  const [apiToken, setApiToken] = useState(organization.whatsapp_api_token || '');
  const [apiUrl, setApiUrl] = useState(organization.whatsapp_api_url || '');
  const [reminderHours, setReminderHours] = useState(organization.whatsapp_reminder_hours || 2);
  
  const [confirmationMsg, setConfirmationMsg] = useState(
    organization.whatsapp_msg_confirmation || 
    'Fala {cliente}! Seu agendamento foi confirmado para {data} às {horario} na {barbearia}. Te esperamos! ✂️'
  );

  const [reminderMsg, setReminderMsg] = useState(
    organization.whatsapp_msg_reminder || 
    'Fala {cliente}! Passando para lembrar que seu corte está marcado para hoje às {horario} na {barbearia}. Até logo! 💈'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Teste de Disparo
  const [testPhone, setTestPhone] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const updated = await DataService.updateOrganization({
        id: organization.id,
        whatsapp_auto_enabled: enabled,
        whatsapp_api_instance: instanceId.trim(),
        whatsapp_api_token: apiToken.trim(),
        whatsapp_api_url: apiUrl.trim() || undefined,
        whatsapp_reminder_hours: Number(reminderHours) || 2,
        whatsapp_msg_confirmation: confirmationMsg.trim(),
        whatsapp_msg_reminder: reminderMsg.trim(),
      });

      onUpdateOrg(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações do WhatsApp:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendTest() {
    if (!testPhone.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    const sampleText = confirmationMsg
      .replace('{cliente}', 'Cliente Teste')
      .replace('{data}', 'hoje')
      .replace('{horario}', '14:30')
      .replace('{barbearia}', organization.name)
      .replace('{servico}', 'Corte + Barba')
      .replace('{valor}', 'R$ 60,00');

    const result = await DataService.sendAutomatedWhatsAppMessage({
      org: {
        ...organization,
        whatsapp_auto_enabled: enabled,
        whatsapp_api_instance: instanceId,
        whatsapp_api_token: apiToken,
        whatsapp_api_url: apiUrl,
      },
      phone: testPhone,
      message: sampleText,
    });

    setIsTesting(false);
    if (result.success) {
      setTestResult({ success: true, msg: 'Mensagem de teste enviada com sucesso!' });
    } else {
      setTestResult({ success: false, msg: result.error || 'Falha ao disparar. Verifique o Token/Instância.' });
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      
      {/* Banner Principal de Status */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">Disparos Automáticos de WhatsApp</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                enabled && instanceId && apiToken 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {enabled && instanceId && apiToken ? 'Automação Ativa' : 'Desconectado'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Envia confirmação na hora do agendamento e lembrete automático de 2 horas antes para zerar faltas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 shadow-sm ${
            enabled
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {enabled ? 'Automação Ligada' : 'Ligar Automação'}
        </button>
      </div>

      {/* Guia Rápido de Conexão Z-API */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-emerald-400" /> Como Conectar o WhatsApp da Barbearia (3 Minutos)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
            <span className="font-bold text-emerald-400 block">1. Criar Instância</span>
            <p className="text-[11px] text-zinc-400">
              Acesse <a href="https://z-api.io" target="_blank" rel="noopener noreferrer" className="text-white underline inline-flex items-center gap-0.5">z-api.io <ExternalLink className="w-2.5 h-2.5" /></a> e crie uma instância com o nome da sua barbearia.
            </p>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
            <span className="font-bold text-emerald-400 block">2. Escanear QR Code</span>
            <p className="text-[11px] text-zinc-400">
              Abra o WhatsApp no celular, vá em <strong>Aparelhos Conectados</strong> e escaneie o QR Code na tela da Z-API.
            </p>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
            <span className="font-bold text-emerald-400 block">3. Colar as Chaves</span>
            <p className="text-[11px] text-zinc-400">
              Copie o <strong>ID da Instância</strong> e o <strong>Token</strong> gerados e cole nos campos abaixo.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário de Configuração */}
      <form onSubmit={handleSave} className="space-y-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 sm:p-6">
        
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-zinc-800">
          <Key className="w-4 h-4 text-zinc-400" /> Credenciais da API (Z-API / Evolution API)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">ID da Instância *</label>
            <input 
              type="text"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              placeholder="Ex: 3B92A4B..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Token de Envio *</label>
            <input 
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Ex: A8F90C..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1">
            URL Base Customizada (Opcional - Apenas se usar Evolution API própria)
          </label>
          <input 
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="Deixe em branco para usar o padrão da Z-API"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <h3 className="text-sm font-bold text-white flex items-center gap-2 pt-3 pb-2 border-b border-zinc-800">
          <Clock className="w-4 h-4 text-zinc-400" /> Mensagens Automáticas & Variáveis
        </h3>

        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1">
            Antecedência do Lembrete Automático
          </label>
          <select 
            value={reminderHours}
            onChange={(e) => setReminderHours(Number(e.target.value))}
            className="w-full sm:w-64 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
          >
            <option value={1}>1 hora antes do corte</option>
            <option value={2}>2 horas antes do corte (Recomendado)</option>
            <option value={3}>3 horas antes do corte</option>
            <option value={24}>1 dia (24h) antes do corte</option>
          </select>
        </div>

        {/* Mensagem 1: Confirmação Imediata */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-zinc-400 font-medium">1. Mensagem de Confirmação Imediata</label>
            <span className="text-[10px] text-zinc-500">Disparada ao finalizar agendamento</span>
          </div>
          <textarea 
            rows={3}
            value={confirmationMsg}
            onChange={(e) => setConfirmationMsg(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-sans"
          />
        </div>

        {/* Mensagem 2: Lembrete Automático */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-zinc-400 font-medium">2. Mensagem de Lembrete de Horário</label>
            <span className="text-[10px] text-zinc-500">Disparada {reminderHours}h antes</span>
          </div>
          <textarea 
            rows={3}
            value={reminderMsg}
            onChange={(e) => setReminderMsg(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-sans"
          />
        </div>

        <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300">Variáveis disponíveis para os textos:</p>
          <p className="font-mono text-[10px] text-emerald-400">
            {'{cliente}'}, {'{horario}'}, {'{data}'}, {'{barbearia}'}, {'{servico}'}, {'{valor}'}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Salvar Automação
            </button>
          </div>
        </div>

      </form>

      {/* Caixa de Teste de Disparo Real */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-emerald-400" /> Testar Disparo de Mensagem no seu Celular
        </h4>
        <p className="text-xs text-zinc-400">
          Envie uma mensagem de teste para o seu próprio WhatsApp para validar a conexão da API.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2 max-w-md">
          <input 
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="Seu WhatsApp (ex: 11999999999)"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isTesting || !testPhone.trim() || !instanceId || !apiToken}
            className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shrink-0 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar Teste
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.msg}</span>
          </div>
        )}
      </div>

    </div>
  );
}
