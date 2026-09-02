import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  MessageCircle, 
  Calendar, 
  Scissors, 
  Loader2, 
  UserCheck, 
  ExternalLink 
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Appointment, Organization } from '@/src/types/database';

interface ClientsTabProps {
  organization: Organization;
}

interface ClientSummary {
  name: string;
  phone: string;
  totalAppointments: number;
  lastVisit: string;
  services: string[];
}

export function ClientsTab({ organization }: ClientsTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchClients() {
      setLoading(true);
      try {
        const apts = await DataService.getAppointments(organization.id);
        setAppointments(apts);
      } catch (e) {
        console.error('Erro ao carregar histórico de clientes:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, [organization.id]);

  // Agrupar agendamentos por telefone/nome do cliente
  const clientsMap = React.useMemo(() => {
    const map = new Map<string, ClientSummary>();

    appointments.forEach((apt) => {
      const key = (apt.client_phone || apt.client_name).toLowerCase().trim();
      const srvName = typeof apt.service === 'object' && apt.service?.name ? apt.service.name : 'Atendimento';

      if (!map.has(key)) {
        map.set(key, {
          name: apt.client_name,
          phone: apt.client_phone || '',
          totalAppointments: 1,
          lastVisit: apt.start_time,
          services: [srvName],
        });
      } else {
        const existing = map.get(key)!;
        existing.totalAppointments += 1;
        if (new Date(apt.start_time) > new Date(existing.lastVisit)) {
          existing.lastVisit = apt.start_time;
        }
        if (!existing.services.includes(srvName)) {
          existing.services.push(srvName);
        }
      }
    });

    return Array.from(map.values());
  }, [appointments]);

  const filteredClients = clientsMap.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Clientes da Barbearia</h2>
          <p className="text-xs text-zinc-400">
            Base de contatos dos clientes que já realizaram agendamentos pelo seu site oficial.
          </p>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      {/* Cards de Métricas de Clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Total de Clientes</span>
            <span className="text-xl font-bold text-white">{clientsMap.length}</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Clientes Recorrentes (2+ cortes)</span>
            <span className="text-xl font-bold text-emerald-400">
              {clientsMap.filter(c => c.totalAppointments > 1).length}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" /> Lista de Contatos ({filteredClients.length})
        </h3>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
            <p className="text-xs">Carregando base de clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-800/80 rounded-xl p-6">
            <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">Nenhum cliente encontrado.</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Assim que os clientes agendarem horários pelo site, seus nomes e contatos ficarão salvos aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {filteredClients.map((client, idx) => {
              const cleanPhone = client.phone.replace(/\D/g, '');
              const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(client.name)}!%20Tudo%20bem%3F%20Passando%20da%20${encodeURIComponent(organization.name)}%20para%20saber%20se%20gostaria%20de%20agendar%20um%20novo%20hor%C3%A1rio.` : null;

              return (
                <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 rounded-xl hover:bg-zinc-900/20 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{client.name}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                          {client.totalAppointments} {client.totalAppointments === 1 ? 'atendimento' : 'atendimentos'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-zinc-400">
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-zinc-500" /> {client.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Calendar className="w-3 h-3" /> Último corte: {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Chamar no WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
