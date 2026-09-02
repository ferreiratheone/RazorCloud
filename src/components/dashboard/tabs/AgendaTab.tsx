import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CalendarDays, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  User,
  Loader2, 
  Calendar as CalendarIcon, 
  Phone, 
  Scissors,
  MessageCircle,
  Crown,
  ChevronLeft,
  ChevronRight
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Registro de IDs excluídos para prevenir que o polling em tempo real restaure agendamentos deletados
  const deletedIdsRef = useRef<Set<string>>(new Set());

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
      
      // Filtrar qualquer ID que tenha acabado de ser deletado pelo usuário
      const validApts = apts.filter(a => !deletedIdsRef.current.has(a.id));
      setAppointments(validApts);
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

    // Sincronização automática em tempo real a cada 5s
    const interval = setInterval(loadData, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [organization.id, selectedDate]);

  // Cálculo dos 7 Dias da Semana Selecionada
  const weekDays = useMemo(() => {
    const parts = selectedDate.split('-').map(Number);
    const curr = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    
    const dayOfWeek = curr.getDay(); // 0 = Dom, 1 = Seg...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const todayStr = getLocalDateString(new Date());
    const days = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(d);
      days.push({
        dateStr,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dateObj: d,
      });
    }
    return days;
  }, [selectedDate]);

  // Troca de Semana (Anterior / Próxima / Hoje)
  function handleNavigateWeek(direction: 'prev' | 'next' | 'today') {
    if (direction === 'today') {
      setSelectedDate(getLocalDateString(new Date()));
      return;
    }
    const parts = selectedDate.split('-').map(Number);
    const curr = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const offset = direction === 'next' ? 7 : -7;
    curr.setDate(curr.getDate() + offset);
    setSelectedDate(getLocalDateString(curr));
  }

  // Filtragem de agendamentos por status
  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'all') return appointments;
    return appointments.filter(a => a.status === statusFilter);
  }, [appointments, statusFilter]);

  // Métricas do dia
  const activeAppointments = appointments.filter(a => a.status !== 'cancelled');
  const totalRevenue = activeAppointments.reduce((acc, a) => acc + (Number(a.price) || 0), 0);
  const totalCompleted = appointments.filter(a => a.status === 'completed').length;

  async function handleStatusChange(id: string, newStatus: Appointment['status']) {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    await DataService.updateAppointmentStatus(id, newStatus, organization.id);
  }

  // Exclusão Imediata em 1 Clique (sem travas ou modais bloqueantes)
  async function handleDeleteAppointment(id: string) {
    deletedIdsRef.current.add(id);
    setAppointments(prev => prev.filter(a => a.id !== id));
    await DataService.deleteAppointment(id, organization.id);
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

  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 7) return '';
    const first = weekDays[0];
    const last = weekDays[6];
    return `${first.dayNum} de ${first.monthName} a ${last.dayNum} de ${last.monthName}`;
  }, [weekDays]);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-full overflow-hidden">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">Agenda de Atendimentos</h2>
          <p className="text-xs text-zinc-400">Controle horários marcados e faturamento em tempo real.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Seletor de Data Calendário Nativo */}
          <div className="relative flex-1 sm:flex-initial">
            <CalendarIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Novo Encaixe
          </button>
        </div>
      </div>

      {/* FILTRO POR SEMANAS (CALENDÁRIO SEMANAL DINÂMICO) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 sm:p-4 space-y-3 shadow-sm max-w-full overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider shrink-0">Filtro Semanal</span>
            <span className="text-[10px] sm:text-xs text-zinc-400 truncate">({weekRangeLabel})</span>
          </div>

          {/* Controles de Navegação da Semana */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleNavigateWeek('prev')}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleNavigateWeek('today')}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 hover:text-white transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => handleNavigateWeek('next')}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Próxima Semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7 Dias da Semana em Cards Clicáveis */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((d) => (
            <button
              key={d.dateStr}
              onClick={() => setSelectedDate(d.dateStr)}
              className={`py-2 px-1 sm:px-2 rounded-xl text-center transition-all duration-200 border flex flex-col items-center justify-center relative
                ${d.isSelected 
                  ? 'bg-white text-zinc-950 font-bold border-white shadow-lg scale-[1.02]' 
                  : d.isToday
                    ? 'bg-zinc-800/90 border-emerald-500/50 text-white hover:bg-zinc-800'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
            >
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase block leading-tight ${d.isSelected ? 'text-zinc-950' : d.isToday ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {d.dayName}
              </span>
              <span className="text-xs sm:text-base font-bold block mt-0.5 leading-tight">
                {d.dayNum}
              </span>
              {d.isToday && !d.isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute bottom-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Métricas do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

      {/* Lista de Agendamentos com Filtro de Status */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 space-y-4 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/60">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" /> Horários do Dia
            </h3>
            <span className="text-xs text-zinc-400">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Abas de Filtro de Status */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                statusFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({appointments.length})
            </button>
            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                statusFilter === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Confirmados ({appointments.filter(a => a.status === 'confirmed').length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                statusFilter === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Concluídos ({appointments.filter(a => a.status === 'completed').length})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                statusFilter === 'cancelled' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cancelados ({appointments.filter(a => a.status === 'cancelled').length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
            <p className="text-xs">Carregando agendamentos...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-800/80 rounded-xl p-6">
            <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">
              {statusFilter === 'all' 
                ? 'Nenhum agendamento para esta data.' 
                : `Nenhum agendamento com status "${statusFilter}" nesta data.`}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">Os clientes que agendarem pelo site oficial aparecerão automaticamente aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((apt) => {
              const startDate = new Date(apt.start_time);
              const timeFormatted = !isNaN(startDate.getTime()) 
                ? startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                : '--:--';

              const serviceName = apt.service?.name || 'Corte Barbearia';
              const serviceDuration = apt.service?.duration || 30;
              const barberName = apt.barber?.full_name || 'Profissional';

              const cleanPhone = (apt.client_phone || '').replace(/\D/g, '');
              const reminderText = `Fala ${apt.client_name}! Passando para lembrar do seu corte hoje às ${timeFormatted} na ${organization.name}. Te esperamos lá! ✂️`;
              const whatsappReminderUrl = cleanPhone 
                ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(reminderText)}`
                : `https://wa.me/?text=${encodeURIComponent(reminderText)}`;

              return (
                <div 
                  key={apt.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    apt.status === 'completed'
                      ? 'bg-zinc-950/40 border-zinc-800/60 opacity-75'
                      : apt.status === 'cancelled'
                        ? 'bg-red-950/10 border-red-900/20 opacity-60'
                        : 'bg-zinc-900/70 border-zinc-800 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Horário e Dados do Cliente */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-emerald-400 leading-none">{timeFormatted}</span>
                        <span className="text-[9px] text-zinc-400 mt-0.5">R$ {Number(apt.price).toFixed(0)}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-white truncate">{apt.client_name}</h4>
                          
                          {apt.is_subscription && (
                            <span className="text-[9px] sm:text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 text-amber-400" /> VIP
                            </span>
                          )}

                          <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                            apt.status === 'confirmed' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : apt.status === 'completed'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-zinc-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-zinc-500" /> {serviceName} ({serviceDuration} min)
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-zinc-500" /> {barberName}
                          </span>
                          {apt.client_phone && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="flex items-center gap-1 text-zinc-400 font-mono">
                                <Phone className="w-3 h-3 text-zinc-500" /> {apt.client_phone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação Direta */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Botão de Lembrete no WhatsApp */}
                      {apt.status === 'confirmed' && cleanPhone && (
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

                      {/* Botão de Concluir Atendimento */}
                      {apt.status === 'confirmed' && (
                        <button 
                          onClick={() => handleStatusChange(apt.id, 'completed')}
                          title="Marcar como atendido / concluído"
                          className="p-2 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 rounded-lg transition-colors border border-zinc-800 hover:border-emerald-500/30"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Botão de Excluir Registro em 1 Clique (Lixeira Direta) */}
                      <button 
                        onClick={() => handleDeleteAppointment(apt.id)}
                        title="Excluir agendamento (libera o horário)"
                        className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors border border-zinc-800 hover:border-red-500/30"
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
                  className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Agendar Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
