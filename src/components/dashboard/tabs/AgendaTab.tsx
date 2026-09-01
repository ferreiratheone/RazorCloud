import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  User, 
  Loader2,
  Calendar as CalendarIcon,
  Phone
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Appointment, Organization, Service, UserProfile } from '@/src/types/database';

interface AgendaTabProps {
  organization: Organization;
  onNavigateToServices?: () => void;
}

export function AgendaTab({ organization, onNavigateToServices }: AgendaTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New appointment form state
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newBarberId, setNewBarberId] = useState('');
  const [newTime, setNewTime] = useState('14:00');
  const [isCreating, setIsCreating] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [apts, srvs, teamList] = await Promise.all([
        DataService.getAppointments(organization.id, selectedDate),
        DataService.getServices(organization.id),
        DataService.getTeam(organization.id),
      ]);
      setAppointments(apts);
      setServices(srvs);
      setTeam(teamList);
      if (srvs.length > 0 && !newServiceId) setNewServiceId(srvs[0].id);
      if (teamList.length > 0 && !newBarberId) setNewBarberId(teamList[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [organization.id, selectedDate]);

  // Cálculos de métricas do dia
  const activeAppointments = appointments.filter(a => a.status !== 'cancelled');
  const totalRevenue = activeAppointments.reduce((acc, a) => acc + (Number(a.price) || 0), 0);
  const totalCompleted = appointments.filter(a => a.status === 'completed').length;
  const occupancyRate = Math.min(100, Math.round((activeAppointments.length / 16) * 100)); // base de 16 slots por dia

  async function handleStatusChange(id: string, newStatus: Appointment['status']) {
    await DataService.updateAppointmentStatus(id, newStatus);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName || !newServiceId || !newBarberId) return;

    setIsCreating(true);
    try {
      const srv = services.find(s => s.id === newServiceId);
      const duration = srv?.duration || 30;
      const [hours, mins] = newTime.split(':').map(Number);
      
      const start = new Date(`${selectedDate}T00:00:00`);
      start.setHours(hours, mins, 0, 0);
      const end = new Date(start.getTime() + duration * 60 * 1000);

      await DataService.createAppointment({
        organization_id: organization.id,
        service_id: newServiceId,
        user_id: newBarberId,
        client_name: newClientName,
        client_phone: newClientPhone,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed',
        price: srv?.price || 50,
      });

      setIsModalOpen(false);
      setNewClientName('');
      setNewClientPhone('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com Data e Ação Rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Agenda do Dia</h2>
          <p className="text-xs text-zinc-400">Acompanhe e gerencie todos os clientes agendados.</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-zinc-700"
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-zinc-950 hover:bg-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-2xl">
          <div className="p-2 bg-zinc-800/60 rounded-lg w-fit mb-3">
            <CalendarDays className="w-4 h-4 text-zinc-300" />
          </div>
          <p className="text-zinc-400 text-xs font-medium">Agendamentos Hoje</p>
          <p className="text-2xl font-bold text-zinc-100 mt-0.5">{activeAppointments.length}</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-2xl">
          <div className="p-2 bg-emerald-500/10 rounded-lg w-fit mb-3 border border-emerald-500/20">
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-zinc-400 text-xs font-medium">Receita Estimada</p>
          <p className="text-2xl font-bold text-emerald-400 mt-0.5">R$ {totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-2xl">
          <div className="p-2 bg-zinc-800/60 rounded-lg w-fit mb-3">
            <TrendingUp className="w-4 h-4 text-zinc-300" />
          </div>
          <p className="text-zinc-400 text-xs font-medium">Taxa de Ocupação</p>
          <p className="text-2xl font-bold text-zinc-100 mt-0.5">{occupancyRate}%</p>
        </div>
      </div>

      {/* Lista de Agendamentos Reais */}
      <div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
          Próximos Clientes ({appointments.length})
        </h3>

        {loading ? (
          <div className="p-12 text-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
            Carregando agenda...
          </div>
        ) : appointments.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-800/60 rounded-2xl p-10 text-center bg-zinc-900/20">
            <CalendarDays className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-zinc-300">Nenhum agendamento para esta data</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Compartilhe o link público com seus clientes ou crie um agendamento manual no botão acima.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {appointments.map((apt) => {
              const date = new Date(apt.start_time);
              const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const srv = apt.service || services.find(s => s.id === apt.service_id);
              const barber = apt.barber || team.find(t => t.id === apt.user_id);

              return (
                <div 
                  key={apt.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-900/40 border rounded-xl gap-3 transition-all
                    ${apt.status === 'completed' ? 'border-zinc-800/40 opacity-70' : apt.status === 'cancelled' ? 'border-red-900/30 opacity-50 bg-red-950/10' : 'border-zinc-800/60'}
                  `}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-zinc-800 rounded-full border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                      {apt.client_name ? apt.client_name.substring(0, 2).toUpperCase() : 'CL'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-white">{apt.client_name}</p>
                        {apt.status === 'completed' && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Concluído</span>
                        )}
                        {apt.status === 'cancelled' && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">Cancelado</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span>{srv?.name || 'Serviço'} • {srv?.duration || 30} min</span>
                        {barber && <span className="text-zinc-500">• Barbeiro: {barber.full_name}</span>}
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
                      <p className="text-[11px] text-zinc-400 font-medium">R$ {Number(apt.price).toFixed(2)}</p>
                    </div>

                    {apt.status === 'confirmed' && (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleStatusChange(apt.id, 'completed')}
                          title="Marcar como atendido"
                          className="p-2 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 rounded-lg transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(apt.id, 'cancelled')}
                          title="Cancelar agendamento"
                          className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Novo Agendamento Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">Criar Agendamento Manual</h3>
            
            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome do Cliente</label>
                <input 
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: João Silva"
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
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Barbeiro</label>
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
                <label className="text-xs text-zinc-400 font-medium block mb-1">Horário de Início</label>
                <input 
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
