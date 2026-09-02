import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Plus, 
  User, 
  Loader2, 
  Calendar as CalendarIcon, 
  Phone, 
  Sparkles, 
  Scissors,
  MessageCircle,
  Crown
} from 'lucide-react';
import { DataService, getLocalDateString } from '@/src/lib/data-service';
import { OnboardingChecklist } from '../OnboardingChecklist';
import type { Appointment, Organization, Service, UserProfile, Schedule } from '@/src/types/database';

interface AgendaTabProps {
  organization: Organization;
  onNavigateTab: (tab: 'services' | 'team' | 'hours' | 'settings') => void;
  onViewPublicPage: (slug: string) => void;
}

export function AgendaTab({ organization, onNavigateTab, onViewPublicPage }: AgendaTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State para Encaixes Manuais
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newBarberId, setNewBarberId] = useState('');
  const [newTime, setNewTime] = useState('14:00');
  const [isCreating, setIsCreating] = useState(false);

  async function loadData() {
    try {
      const [apts, srvs, teamList, schedList] = await Promise.all([
        DataService.getAppointments(organization.id, selectedDate),
        DataService.getServices(organization.id),
        DataService.getTeam(organization.id),
        DataService.getSchedules(organization.id),
      ]);
      setAppointments(apts);
      setServices(srvs);
      setTeam(teamList);
      setSchedules(schedList);
      if (srvs.length > 0 && !newServiceId) setNewServiceId(srvs[0].id);
      if (teamList.length > 0 && !newBarberId) setNewBarberId(teamList[0].id);
    } catch (e) {
      console.error('Erro ao carregar dados da agenda:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData();

    // Sincronização automática em tempo real a cada 5s e ao focar a aba
    const interval = setInterval(loadData, 5000);
    window.addEventListener('focus', loadData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', loadData);
    };
  }, [organization.id, selectedDate]);

  // Métricas do dia
  const activeAppointments = appointments.filter(a => a.status !== 'cancelled');
  const totalRevenue = activeAppointments.reduce((acc, a) => acc + (Number(a.price) || 0), 0);
  const totalCompleted = appointments.filter(a => a.status === 'completed').length;

  async function handleStatusChange(id: string, newStatus: Appointment['status']) {
    await DataService.updateAppointmentStatus(id, newStatus, organization.id);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  }

  async function handleDeleteAppointment(id: string) {
    if (!confirm('Deseja realmente excluir este agendamento do histórico?')) return;
    await DataService.deleteAppointment(id, organization.id);
    setAppointments(prev => prev.filter(a => a.id !== id));
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName || !newServiceId) return;

    setIsCreating(true);
    try {
      const srv = services.find(s => s.id === newServiceId);
      const duration = srv?.duration || 30;
      const [hours, mins] = newTime.split(':').map(Number);
      
      const start = new Date(`${selectedDate}T00:00:00`);
      start.setHours(hours, mins, 0, 0);
      const end = new Date(start.getTime() + duration * 60 * 1000);

      const barberId = newBarberId || (team.length > 0 ? team[0].id : 'owner-user');

      const created = await DataService.createAppointment({
        organization_id: organization.id,
        service_id: newServiceId,
        user_id: barberId,
        client_name: newClientName.trim(),
        client_phone: newClientPhone.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed',
        price: srv?.price || 50,
      });

      setAppointments(prev => [created, ...prev]);
      setIsModalOpen(false);
      setNewClientName('');
      setNewClientPhone('');
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Guia / Barra Oficial da Barbearia */}
      <OnboardingChecklist 
        organization={organization}
        services={services}
        team={team}
        schedules={schedules}
        onNavigateTab={onNavigateTab}
        onViewPublicPage={onViewPublicPage}
      />

      {/* Header da Agenda e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Agenda de Atendimentos</h2>
          <p className="text-xs text-zinc-400">Controle os horários marcados pelos clientes e faturamento em tempo real.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de Data */}
          <div className="relative">
            <CalendarIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Encaixe
          </button>
        </div>
      </div>

      {/* Cards de Métricas do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Agendamentos</span>
            <span className="text-xl font-bold text-white">{activeAppointments.length}</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Faturamento Previsto</span>
            <span className="text-xl font-bold text-emerald-400">R$ {totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-zinc-300" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Atendimentos Concluídos</span>
            <span className="text-xl font-bold text-white">{totalCompleted} / {appointments.length}</span>
          </div>
        </div>
      </div>

      {/* Lista de Agendamentos */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" /> Horários do Dia
          </h3>
          <span className="text-xs text-zinc-400">
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
            <p className="text-xs">Carregando agendamentos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-800/80 rounded-xl p-6">
            <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">Nenhum agendamento para esta data.</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Os clientes que agendarem pelo site oficial aparecerão automaticamente aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {appointments.map((apt) => {
              const srv = services.find(s => s.id === apt.service_id);
              const barber = team.find(t => t.id === apt.user_id);
              const timeStr = new Date(apt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              const cleanPhone = apt.client_phone ? apt.client_phone.replace(/\D/g, '') : '';
              const reminderText = `Fala ${apt.client_name}! Passando para lembrar do seu corte hoje às ${timeStr} na ${organization.name}. Te esperamos lá! ✂️`;
              const whatsappReminderUrl = cleanPhone 
                ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(reminderText)}`
                : null;

              return (
                <div key={apt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-zinc-900/20 px-2 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                      {apt.client_name.substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{apt.client_name}</span>
                        {apt.is_subscription && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Crown className="w-3 h-3" /> VIP
                          </span>
                        )}
                        {apt.status === 'completed' && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Concluído</span>
                        )}
                        {apt.status === 'cancelled' && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">Cancelado</span>
                        )}
                        {apt.status === 'confirmed' && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-medium">Confirmado</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span>{srv?.name || 'Serviço'} • {srv?.duration || 30} min</span>
                        {barber && <span className="text-zinc-500">• {barber.full_name}</span>}
                      </p>
                      {apt.client_phone && (
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {apt.client_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-zinc-800/50 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="font-bold text-sm text-emerald-400">{timeStr}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">
                        {apt.is_subscription ? (
                          <span className="text-amber-400 font-semibold">Plano VIP</span>
                        ) : (
                          `R$ ${Number(apt.price).toFixed(2)}`
                        )}
                      </p>
                    </div>

                    {/* Botões de Ação Rápida */}
                    <div className="flex items-center gap-1">
                      {/* Botão de Lembrete no WhatsApp */}
                      {whatsappReminderUrl && apt.status === 'confirmed' && (
                        <a 
                          href={whatsappReminderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar lembrete no WhatsApp do cliente"
                          className="p-2 hover:bg-emerald-500/20 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      {apt.status === 'confirmed' && (
                        <>
                          <button 
                            onClick={() => handleStatusChange(apt.id, 'completed')}
                            title="Marcar como atendido / concluído"
                            className="p-2 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleStatusChange(apt.id, 'cancelled')}
                            title="Cancelar agendamento (libera o horário)"
                            className="p-2 hover:bg-amber-500/10 text-zinc-400 hover:text-amber-400 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Botão de Excluir Registro do Histórico */}
                      <button 
                        onClick={() => handleDeleteAppointment(apt.id)}
                        title="Excluir permanentemente do histórico"
                        className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Novo Agendamento Manual (Encaixe) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Criar Agendamento Manual</h3>
            
            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome do Cliente *</label>
                <input 
                  type="text" 
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: Carlos Santana"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">WhatsApp / Telefone</label>
                <input 
                  type="tel" 
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Serviço</label>
                  <select 
                    value={newServiceId}
                    onChange={(e) => setNewServiceId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (R$ {Number(s.price).toFixed(2)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Profissional</label>
                  <select 
                    value={newBarberId}
                    onChange={(e) => setNewBarberId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                  >
                    {team.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Horário do Atendimento</label>
                <input 
                  type="time" 
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Salvando...' : 'Salvar Encaixe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
