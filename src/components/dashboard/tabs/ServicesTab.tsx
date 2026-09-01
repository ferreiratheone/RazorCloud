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
        });
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
    if (confirm('Tem certeza que deseja remover este serviço?')) {
      await DataService.deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
    }
  }

  async function handleToggleActive(srv: Service) {
    const updated = !srv.active;
    await DataService.updateService(srv.id, { active: updated });
    setServices(prev => prev.map(s => s.id === srv.id ? { ...s, active: updated } : s));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Gestão de Serviços e Preços</h2>
          <p className="text-xs text-zinc-400">Cadastre os cortes, barbas e tratamentos disponíveis para agendamento.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Novo Serviço
        </button>
      </div>

      {/* Grid de Serviços */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
          Carregando serviços...
        </div>
      ) : services.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-800/60 rounded-2xl p-12 text-center bg-zinc-900/20">
          <Scissors className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-zinc-300">Nenhum serviço cadastrado</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Clique no botão acima para adicionar seu primeiro serviço e começar a receber agendamentos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((srv) => (
            <div 
              key={srv.id} 
              className={`bg-zinc-900/40 border rounded-2xl p-5 flex flex-col justify-between transition-all
                ${srv.active ? 'border-zinc-800/60' : 'border-zinc-800/30 opacity-60 bg-zinc-950/40'}
              `}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white text-base">{srv.name}</h3>
                    {srv.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{srv.description}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleToggleActive(srv)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors shrink-0
                      ${srv.active 
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' 
                        : 'text-zinc-500 bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800'
                      }`}
                  >
                    {srv.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/50">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-white text-sm">R$ {Number(srv.price).toFixed(2)}</span>
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {srv.duration} min
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleOpenEdit(srv)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(srv.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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

      {/* Modal de Criação / Edição de Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome do Serviço</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Corte Degradê + Barba"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Descrição (Opcional)</label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Inclui lavagem especial, toalha quente e finalização..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Preço (R$)</label>
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
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Duração (minutos)</label>
                  <select 
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">60 minutos (1h)</option>
                    <option value="75">75 minutos</option>
                    <option value="90">90 minutos (1h30)</option>
                    <option value="120">120 minutos (2h)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="chk-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-white focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="chk-active" className="text-xs text-zinc-300 cursor-pointer">
                  Disponível para agendamento online pelos clientes
                </label>
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
                  disabled={isSaving}
                  className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
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
