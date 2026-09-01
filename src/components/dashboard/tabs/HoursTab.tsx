import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Save, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, Schedule } from '@/src/types/database';

interface HoursTabProps {
  organization: Organization;
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

export function HoursTab({ organization }: HoursTabProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadSchedules() {
      setLoading(true);
      try {
        const list = await DataService.getSchedules(organization.id);
        
        // Garantir que todos os 7 dias existam
        const fullWeek: Schedule[] = [];
        for (let day = 0; day <= 6; day++) {
          const existing = list.find(s => s.day_of_week === day);
          if (existing) {
            fullWeek.push(existing);
          } else {
            fullWeek.push({
              id: `sch-${day}`,
              organization_id: organization.id,
              day_of_week: day,
              start_time: '09:00',
              end_time: '19:00',
              is_closed: day === 0, // Domingo fechado por padrão
            });
          }
        }
        setSchedules(fullWeek);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSchedules();
  }, [organization.id]);

  function handleToggleClosed(dayOfWeek: number) {
    setSchedules(prev => prev.map(s => {
      if (s.day_of_week === dayOfWeek) {
        return { ...s, is_closed: !s.is_closed };
      }
      return s;
    }));
    setSavedSuccess(false);
  }

  function handleTimeChange(dayOfWeek: number, field: 'start_time' | 'end_time', value: string) {
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
      await DataService.saveSchedules(organization.id, schedules);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Horários de Funcionamento</h2>
          <p className="text-xs text-zinc-400">Defina os dias abertos e a jornada de atendimento para cálculo automático de horários na vitrine.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
          ) : savedSuccess ? (
            <><Check className="w-3.5 h-3.5 text-emerald-600" /> Salvo com Sucesso!</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Salvar Horários</>
          )}
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
          Carregando grade de horários...
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden">
          {schedules.map((schedule) => {
            const dayName = DAY_NAMES[schedule.day_of_week];
            return (
              <div 
                key={schedule.day_of_week}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors
                  ${schedule.is_closed ? 'bg-zinc-950/40 opacity-60' : 'bg-transparent'}
                `}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    id={`day-${schedule.day_of_week}`}
                    checked={!schedule.is_closed}
                    onChange={() => handleToggleClosed(schedule.day_of_week)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-white cursor-pointer"
                  />
                  <label 
                    htmlFor={`day-${schedule.day_of_week}`}
                    className="text-sm font-medium text-white cursor-pointer"
                  >
                    {dayName}
                  </label>
                  {schedule.is_closed && (
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-md">
                      Fechado
                    </span>
                  )}
                </div>

                {!schedule.is_closed ? (
                  <div className="flex items-center gap-3 self-end sm:self-center text-xs text-zinc-400">
                    <span className="text-zinc-500">Abre às</span>
                    <input 
                      type="time" 
                      value={schedule.start_time.substring(0, 5)}
                      onChange={(e) => handleTimeChange(schedule.day_of_week, 'start_time', e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-zinc-600 text-xs font-mono"
                    />
                    <span className="text-zinc-500">Fecha às</span>
                    <input 
                      type="time" 
                      value={schedule.end_time.substring(0, 5)}
                      onChange={(e) => handleTimeChange(schedule.day_of_week, 'end_time', e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-zinc-600 text-xs font-mono"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 self-end sm:self-center">Não há atendimento neste dia</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
