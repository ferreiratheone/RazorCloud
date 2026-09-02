import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Clock, 
  Loader2,
  AlertCircle 
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, Service } from '@/src/types/database';

interface ServicesTabProps {
  organization: Organization;
}

export function ServicesTab({ organization }: ServicesTabProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('50.00');
  const [duration, setDuration] = useState('30');
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadServices() {
    setLoading(true);
    try {
      const list = await DataService.getServices(organization.id);
      setServices(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, [organization.id]);

  function handleOpenCreate() {
    setEditingService(null);
    setName('');
    setDescription('');
    setPrice('50.00');
    setDuration('30');
    setActive(true);
    setIsModalOpen(true);
  }

  function handleOpenEdit(srv: Service) {
    setEditingService(srv);
    setName(srv.name);
    setDescription(srv.description || '');
    setPrice(String(srv.price));
    setDuration(String(srv.duration));
    setActive(srv.active);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (editingService) {
        await DataService.updateService(editingService.id, {
          name: name.trim(),
          description: description.trim(),
          price: parseFloat(price) || 0,
          duration: parseInt(duration, 10) || 30,
          active,
        }, organization.id);
      } else {
        await DataService.createService({
          organization_id: organization.id,
          name: name.trim(),
          description: description.trim(),
          price: parseFloat(price) || 0,
          duration: parseInt(duration, 10) || 30,
          active,
        });
      }
      setIsModalOpen(false);
      await loadServices();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente remover este serviço?')) return;
    await DataService.deleteService(id, organization.id);
    await loadServices();
  }

  async function handleToggleActive(srv: Service) {
    await DataService.updateService(srv.id, { active: !srv.active }, organization.id);
    await loadServices();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Scissors className="w-5 h-5 text-zinc-400" /> Serviços & Preços
          </h2>
          <p className="text-xs text-zinc-400">Gerencie os cortes, barboterapias e combos que aparecem na vitrine do cliente.</p>
        </div>

        <button 
          onClick={handleOpenCreate}
          className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Novo Serviço
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
          <p className="text-xs">Carregando catálogo de serviços...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-3xl p-8 text-center bg-zinc-900/20">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Scissors className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Nenhum serviço cadastrado ainda</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5">
            Cadastre cortes de cabelo, barba ou combos para que seus clientes possam agendar online.
          </p>
          <button 
            onClick={handleOpenCreate}
            className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeiro Serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((srv) => (
            <div 
              key={srv.id}
              className={`p-5 rounded-2xl border transition-all ${
                srv.active 
                  ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700' 
                  : 'bg-zinc-950/60 border-zinc-900 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">{srv.name}</h3>
                    {!srv.active && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-medium">Inativo</span>
                    )}
                  </div>
                  {srv.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{srv.description}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-emerald-400">R$ {Number(srv.price).toFixed(2)}</p>
                  <p className="text-[11px] text-zinc-500 flex items-center justify-end gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {srv.duration} min
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-3 text-xs">
                <button
                  onClick={() => handleToggleActive(srv)}
                  className={`text-[11px] font-medium transition-colors ${srv.active ? 'text-zinc-400 hover:text-zinc-200' : 'text-emerald-400'}`}
                >
                  {srv.active ? 'Desativar' : 'Ativar Serviço'}
                </button>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenEdit(srv)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(srv.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome do Serviço *</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Corte Degradê + Lavagem"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Descrição (Opcional)</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre o atendimento, produtos usados, etc."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Preço (R$) *</label>
                  <input 
                    type="number" 
                    step="0.50"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Duração (Minutos) *</label>
                  <select 
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="75">1h 15min</option>
                    <option value="90">1h 30min</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-white focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-zinc-300">Serviço ativo para agendamento online</span>
              </label>

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
                  disabled={isSaving}
                  className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
