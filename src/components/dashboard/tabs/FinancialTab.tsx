import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  ShoppingBag, 
  CheckCircle2, 
  Scissors, 
  User, 
  Calendar, 
  Loader2,
  Percent,
  Receipt,
  ArrowUpRight
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, FinancialMetrics } from '@/src/types/database';

interface FinancialTabProps {
  organization: Organization;
}

export function FinancialTab({ organization }: FinancialTabProps) {
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('month');
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMetrics() {
    setLoading(true);
    try {
      const data = await DataService.getFinancialMetrics(organization.id, period);
      setMetrics(data);
    } catch (e) {
      console.error('Erro ao calcular métricas financeiras:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, [organization.id, period]);

  const maxDailyRevenue = metrics?.dailyRevenue?.length 
    ? Math.max(...metrics.dailyRevenue.map(d => d.revenue), 100) 
    : 100;

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      
      {/* Header com Filtros de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Relatório Financeiro & Métricas
          </h2>
          <p className="text-xs text-zinc-400">
            Acompanhe o faturamento, ticket médio, produtos vendidos e performance da equipe.
          </p>
        </div>

        {/* Filtros de Período */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto text-xs">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              period === 'today' ? 'bg-white text-zinc-950 font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriod('7days')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              period === '7days' ? 'bg-white text-zinc-950 font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              period === 'month' ? 'bg-white text-zinc-950 font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              period === 'all' ? 'bg-white text-zinc-950 font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Geral
          </button>
        </div>
      </div>

      {loading || !metrics ? (
        <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center bg-zinc-900/40 rounded-2xl border border-zinc-800">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
          <p className="text-xs">Consolidando dados financeiros...</p>
        </div>
      ) : (
        <>
          {/* 4 Cards Principais de Indicadores (KPIs) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Card 1: Faturamento Total */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Faturamento Total</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 block tracking-tight">
                  R$ {metrics.totalRevenue.toFixed(2)}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Serviços + Produtos
                </span>
              </div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            {/* Card 2: Ticket Médio */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ticket Médio</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-white block tracking-tight">
                  R$ {metrics.averageTicket.toFixed(2)}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Gasto médio por cliente
                </span>
              </div>
            </div>

            {/* Card 3: Atendimentos Concluídos */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Atendimentos</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-white block tracking-tight">
                  {metrics.completedAppointments} <span className="text-xs font-normal text-zinc-500">/ {metrics.totalAppointments}</span>
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {metrics.cancelledAppointments} cancelamento(s)
                </span>
              </div>
            </div>

            {/* Card 4: Vendas de Produtos */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Produtos Vendidos</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-purple-400 block tracking-tight">
                  R$ {metrics.productsRevenue.toFixed(2)}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {metrics.topProducts.reduce((acc, p) => acc + p.count, 0)} itens retirados
                </span>
              </div>
            </div>

          </div>

          {/* Gráfico de Evolução de Faturamento */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" /> Evolução de Faturamento Diário
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Valores apurados dia a dia no período selecionado.</p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                Pico: R$ {maxDailyRevenue.toFixed(2)}
              </span>
            </div>

            {/* Visualização de Gráfico em Barras Responsivo */}
            <div className="pt-6 pb-2">
              <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-3 items-end h-44 sm:h-52 border-b border-zinc-800/80 px-2 pb-2">
                {metrics.dailyRevenue.map((d, i) => {
                  const barHeight = Math.max(8, Math.round((d.revenue / maxDailyRevenue) * 100));
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group relative">
                      {/* Tooltip Hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 border border-zinc-700 text-[10px] text-white py-1 px-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20">
                        <span className="font-bold text-emerald-400">R$ {d.revenue.toFixed(2)}</span> ({d.appointmentsCount} cortes)
                      </div>

                      {/* Barra */}
                      <div 
                        style={{ height: `${barHeight}%` }}
                        className={`w-full max-w-[36px] rounded-t-lg transition-all duration-500 ${
                          d.revenue > 0 
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 shadow-sm shadow-emerald-500/20' 
                            : 'bg-zinc-800/40'
                        }`}
                      />

                      {/* Legenda de Data */}
                      <span className="text-[9px] sm:text-[10px] text-zinc-400 font-medium truncate w-full text-center group-hover:text-white">
                        {d.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grids de Rankings: Serviços Mais Vendidos & Produtos & Barbeiros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Bloco 1: Serviços Mais Vendidos */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-zinc-400" /> Serviços Mais Vendidos
                </h4>
                <span className="text-[10px] text-zinc-500">Participação</span>
              </div>

              {metrics.topServices.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">Nenhum serviço realizado no período.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.topServices.map((srv, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200 truncate">{srv.name}</span>
                        <span className="font-bold text-emerald-400 shrink-0 ml-2">R$ {srv.revenue.toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(10, srv.percentage))}%` }} 
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{srv.count} atendimento(s)</span>
                        <span>{srv.percentage}% da receita</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloco 2: Produtos da Barbearia Retirados */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-400" /> Produtos Vendidos (Vitrine)
                </h4>
                <span className="text-[10px] text-zinc-500">Qtd</span>
              </div>

              {metrics.topProducts.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">Nenhum produto adicionado no período.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.topProducts.map((prod, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200 truncate">{prod.name}</span>
                        <span className="font-bold text-purple-400 shrink-0 ml-2">R$ {prod.revenue.toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-purple-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(10, prod.percentage))}%` }} 
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{prod.count} unidade(s) vendida(s)</span>
                        <span>{prod.percentage}% das vendas de itens</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloco 3: Desempenho por Barbeiro (Comissões) */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3 md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" /> Produção por Barbeiro
                </h4>
                <span className="text-[10px] text-zinc-500">Cortes</span>
              </div>

              {metrics.barberPerformance.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">Nenhum atendimento atribuído no período.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.barberPerformance.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {b.avatarUrl ? (
                          <img src={b.avatarUrl} alt={b.barberName} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[10px] text-zinc-300 shrink-0">
                            {b.barberName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{b.barberName}</p>
                          <p className="text-[10px] text-zinc-400">{b.cutsCount} atendimento(s)</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-400 block">R$ {b.revenue.toFixed(2)}</span>
                        <span className="text-[9px] text-zinc-500">{b.percentage}% do salão</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

    </div>
  );
}
