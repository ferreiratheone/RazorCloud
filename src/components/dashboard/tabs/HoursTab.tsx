import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Save, 
  Check, 
  Loader2,
  AlertCircle,
  User,
  Building2,
  PauseCircle,
  Sparkles
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, Schedule, UserProfile } from '@/src/types/database';

interface HoursTabProps {
  organization: Organization;
  currentUser: UserProfile;
}

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export function HoursTab({ organization, currentUser }: HoursTabProps) {
  const isOwner = currentUser.role === 'owner' || currentUser.role === 'admin';
  const [selectedUserId, setSelectedUserId] = useState<string | null>(isOwner ? null : currentUser.id);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Carregar equipe se for dono
  useEffect(() => {
    async function loadTeam() {
      if (isOwner) {
        const teamList = await DataService.getTeam(organization.id);
        setTeam(teamList);
      }
    }
    loadTeam();
  }, [organization.id, isOwner]);

  // Carregar horários para o usuário/salão selecionado
  useEffect(() => {
    async function loadSchedules() {
      setLoading(true);
      setSavedSuccess(false);
      try {
        const list = await DataService.getSchedules(organization.id, selectedUserId);
        
        // Garantir que todos os 7 dias existam com intervalo padrão de 1 em 1 hora
        const fullWeek: Schedule[] = [];
        for (let day = 0; day <= 6; day++) {
          const existing = list.find(s => s.day_of_week === day);
          if (existing) {
            fullWeek.push({
              ...existing,
              is_closed: Boolean(existing.is_closed),
              has_break: Boolean(existing.has_break),
              break_start: existing.break_start || '12:00',
              break_end: existing.break_end || '13:00',
              slot_interval: existing.slot_interval || 60,
            });
          } else {
            fullWeek.push({
              id: `sch-${day}-${selectedUserId || 'general'}`,
              organization_id: organization.id,
              user_id: selectedUserId,
              day_of_week: day,
              start_time: '09:00',
              end_time: '19:00',
              is_closed: day === 0, // Domingo fechado por padrão
              has_break: false,
              break_start: '12:00',
              break_end: '13:00',
              slot_interval: 60, // 1 em 1 hora
            });
          }
        }
        setSchedules(fullWeek);
      } catch (e) {
        console.error('Erro ao carregar horários:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSchedules();
  }, [organization.id, selectedUserId]);

  function handleToggleClosed(dayOfWeek: number) {
    setSchedules(prev => prev.map(s => {
      if (s.day_of_week === dayOfWeek) {
        return { ...s, is_closed: !s.is_closed };
      }
      return s;
    }));
    setSavedSuccess(false);
  }

  function handleToggleBreak(dayOfWeek: number) {
    setSchedules(prev => prev.map(s => {
      if (s.day_of_week === dayOfWeek) {
        return { ...s, has_break: !s.has_break };
      }
      return s;
    }));
    setSavedSuccess(false);
  }

  function handleFieldChange(dayOfWeek: number, field: keyof Schedule, value: any) {
    setSchedules(prev => prev.map(s => {
      if (s.day_of_week === dayOfWeek) {
        return { ...s, [field]: value };
      }
      return s;
    }));
    setSavedSuccess(false);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await DataService.saveSchedules(organization.id, schedules, selectedUserId);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Erro ao salvar horários:', e);
    } finally {
      setIsSaving(false);
    }
  }

  const activeBarber = team.find(t => t.id === selectedUserId);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            {isOwner 
              ? (selectedUserId ? `Escala de Trabalho: ${activeBarber?.full_name || 'Barbeiro'}` : 'Horários Gerais da Barbearia')
              : 'Minha Escala de Atendimento no Salão'
            }
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure a jornada diária, inclua paradas/bloqueios de horário e agendamentos de 1 em 1 hora.
          </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto shrink-0"
        >
          {isSaving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
          ) : savedSuccess ? (
            <><Check className="w-3.5 h-3.5 text-emerald-600" /> Horários Salvos!</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Salvar Escala</>
          )}
        </button>
      </div>

      {/* Seletor de Barbeiro (para o Dono) */}
      {isOwner && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <span className="text-xs font-bold text-zinc-300">Configurar Horários de:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setSelectedUserId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                selectedUserId === null 
                  ? 'bg-white text-zinc-950 font-bold shadow-sm' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Geral da Barbearia
            </button>

            {team.map((barber) => (
              <button
                key={barber.id}
                onClick={() => setSelectedUserId(barber.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                  selectedUserId === barber.id 
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" /> {barber.full_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grade de 7 Dias com Suporte a Pausa / Almoço */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 flex flex-col items-center justify-center bg-zinc-900/40 rounded-2xl border border-zinc-800">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
          <p className="text-xs">Carregando escala de horários...</p>
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {schedules.map((schedule) => {
            const dayName = DAY_NAMES[schedule.day_of_week];
            return (
              <div 
                key={schedule.day_of_week}
                className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors
                  ${schedule.is_closed ? 'bg-zinc-950/40 opacity-60' : 'bg-transparent'}
                `}
              >
                {/* Switch do Dia Aberto / Folga */}
                <div className="flex items-center gap-3 shrink-0">
                  <input 
                    type="checkbox"
                    id={`day-${schedule.day_of_week}`}
                    checked={!schedule.is_closed}
                    onChange={() => handleToggleClosed(schedule.day_of_week)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label 
                    htmlFor={`day-${schedule.day_of_week}`}
                    className="text-xs sm:text-sm font-semibold text-white cursor-pointer min-w-[110px]"
                  >
                    {dayName}
                  </label>
                  {schedule.is_closed && (
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                      Folga / Fechado
                    </span>
                  )}
                </div>

                {/* Controles de Horário de Atendimento e Horário de Almoço */}
                {!schedule.is_closed ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    {/* Horário de Funcionamento */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-medium">Atendimento:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">Das</span>
                        <input 
                          type="time" 
                          value={schedule.start_time.substring(0, 5)}
                          onChange={(e) => handleFieldChange(schedule.day_of_week, 'start_time', e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-700 font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">às</span>
                        <input 
                          type="time" 
                          value={schedule.end_time.substring(0, 5)}
                          onChange={(e) => handleFieldChange(schedule.day_of_week, 'end_time', e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-700 font-mono"
                        />
                      </div>
                    </div>

                    {/* Incluir Parada / Bloqueio de Horário */}
                    <div className="flex items-center gap-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2 sm:p-1.5">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          id={`break-${schedule.day_of_week}`}
                          checked={Boolean(schedule.has_break)}
                          onChange={() => handleToggleBreak(schedule.day_of_week)}
                          className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <label 
                          htmlFor={`break-${schedule.day_of_week}`}
                          className="text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer"
                        >
                          <PauseCircle className="w-3.5 h-3.5 text-amber-400" /> Incluir Parada
                        </label>
                      </div>

                      {schedule.has_break ? (
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="time" 
                            value={(schedule.break_start || '12:00').substring(0, 5)}
                            onChange={(e) => handleFieldChange(schedule.day_of_week, 'break_start', e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none font-mono"
                          />
                          <span className="text-zinc-500 text-xs">às</span>
                          <input 
                            type="time" 
                            value={(schedule.break_end || '13:00').substring(0, 5)}
                            onChange={(e) => handleFieldChange(schedule.day_of_week, 'break_end', e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none font-mono"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500 italic">Sem paradas</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500 italic">
                    Nenhum atendimento neste dia
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
