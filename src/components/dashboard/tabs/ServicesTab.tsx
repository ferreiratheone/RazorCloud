import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Clock, 
  Loader2,
  AlertCircle,
  Tag,
  Flame,
  Calendar,
  Sparkles,
  Filter
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, Service } from '@/src/types/database';
import { APP_SERVICE_CATEGORIES, getNormalizedCategory, getCategoryBadge } from '@/src/lib/categories';

interface ServicesTabProps {
  organization: Organization;
}

export const SERVICE_CATEGORIES = APP_SERVICE_CATEGORIES;

export function ServicesTab({ organization }: ServicesTabProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('39.99');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState('Cabelo');
  const [isPromotional, setIsPromotional] = useState(false);
  const [promotionalPrice, setPromotionalPrice] = useState('');
  const [promoDays, setPromoDays] = useState('');
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
    setPrice('39.99');
    setDuration('30');
    setCategory(selectedFilterCategory !== 'all' ? selectedFilterCategory : 'Cabelo');
    setIsPromotional(false);
    setPromotionalPrice('');
    setPromoDays('');
    setActive(true);
    setIsModalOpen(true);
  }

  function handleOpenEdit(srv: Service) {
    setEditingService(srv);
    setName(srv.name);
    setDescription(srv.description || '');
    setPrice(String(srv.price));
    setDuration(String(srv.duration));
    setCategory(getNormalizedCategory(srv));
    setIsPromotional(Boolean(srv.is_promotional));
    setPromotionalPrice(srv.promotional_price !== undefined && srv.promotional_price !== null ? String(srv.promotional_price) : '');
    setPromoDays(srv.promo_days || '');
    setActive(srv.active);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const parsedPrice = parseFloat(price) || 0;
      const parsedPromoPrice = isPromotional && promotionalPrice ? parseFloat(promotionalPrice) || null : null;

      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
        duration: parseInt(duration, 10) || 30,
        category: category || 'Cabelo',
        is_promotional: isPromotional,
        promotional_price: parsedPromoPrice,
        promo_days: isPromotional && promoDays.trim() ? promoDays.trim() : null,
        active,
      };

      if (editingService) {
        await DataService.updateService(editingService.id, payload, organization.id);
      } else {
        await DataService.createService({
          ...payload,
          organization_id: organization.id,
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

  const filteredServices = services.filter(srv => {
    if (selectedFilterCategory === 'all') return true;
    if (selectedFilterCategory === 'promos') return srv.is_promotional || getNormalizedCategory(srv) === 'Combos';
    return getNormalizedCategory(srv) === selectedFilterCategory;
  });

  // Cálculo de desconto para prévia visual no form
  const originalVal = parseFloat(price) || 0;
  const promoVal = parseFloat(promotionalPrice) || 0;
  const discountPercent = originalVal > 0 && promoVal > 0 && promoVal < originalVal 
    ? Math.round(((originalVal - promoVal) / originalVal) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Scissors className="w-5 h-5 text-zinc-400" /> Serviços, Combos & Preços
          </h2>
          <p className="text-xs text-zinc-400">
            Gerencie os cortes, barboterapias, sobrancelhas, química e promoções que aparecem na vitrine do cliente.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate}
          className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Novo Serviço / Combo
        </button>
      </div>

      {/* Barra de Filtros por Categoria */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedFilterCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedFilterCategory === 'all'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <span>Todos ({services.length})</span>
        </button>

        <button
          onClick={() => setSelectedFilterCategory('promos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            selectedFilterCategory === 'promos'
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Promoções ({services.filter(s => s.is_promotional || getNormalizedCategory(s) === 'Combos').length})</span>
        </button>

        {SERVICE_CATEGORIES.map(cat => {
          const count = services.filter(s => getNormalizedCategory(s) === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedFilterCategory === cat.id
                  ? 'bg-zinc-200 text-zinc-950 shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label} ({count})</span>
            </button>
          );
        })}
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
            Cadastre cortes de cabelo, barba, sobrancelha ou combos promocionais para seus clientes agendarem.
          </p>
          <button 
            onClick={handleOpenCreate}
            className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeiro Serviço
          </button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6">
          <p className="text-xs text-zinc-400 mb-2">Nenhum serviço nesta categoria no momento.</p>
          <button
            onClick={handleOpenCreate}
            className="text-xs text-white underline hover:text-zinc-300 font-semibold"
          >
            + Adicionar serviço nesta categoria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map((srv) => {
            const hasPromo = srv.is_promotional && srv.promotional_price !== undefined && srv.promotional_price !== null && Number(srv.promotional_price) > 0;
            const finalPrice = hasPromo ? Number(srv.promotional_price) : Number(srv.price);
            const originalPrice = Number(srv.price);

            return (
              <div 
                key={srv.id}
                className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                  srv.active 
                    ? hasPromo
                      ? 'bg-zinc-900/50 border-amber-500/30 shadow-lg shadow-amber-500/5 hover:border-amber-500/50'
                      : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700' 
                    : 'bg-zinc-950/60 border-zinc-900 opacity-60'
                }`}
              >
                <div>
                  {/* Badges de Categoria e Promoção */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] bg-zinc-800 border border-zinc-700/80 text-zinc-300 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5">
                      <span>{getCategoryBadge(getNormalizedCategory(srv)).icon}</span>
                      <span>{getCategoryBadge(getNormalizedCategory(srv)).label}</span>
                    </span>

                    {hasPromo && (
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                        PROMOÇÃO
                      </span>
                    )}

                    {!srv.active && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-medium">Inativo</span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-white">{srv.name}</h3>
                      {srv.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{srv.description}</p>
                      )}
                      {srv.promo_days && (
                        <p className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1 mt-1.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>Válido: {srv.promo_days}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {hasPromo ? (
                        <div>
                          <span className="text-[11px] text-zinc-500 line-through block">
                            R$ {originalPrice.toFixed(2)}
                          </span>
                          <span className="text-base font-extrabold text-amber-400 block">
                            R$ {finalPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-base font-bold text-emerald-400">R$ {originalPrice.toFixed(2)}</p>
                      )}
                      <p className="text-[11px] text-zinc-500 flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {srv.duration} min
                      </p>
                    </div>
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
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Serviço com Promoção e Categoria */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-emerald-400" />
              {editingService ? 'Editar Serviço / Combo' : 'Novo Serviço / Combo'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome do Serviço / Combo *</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Corte Degradê, Barboterapia, Combo Especial..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Categoria de Atendimento *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                >
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Descrição (Opcional)</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Lavagem com shampoo refrescante, toalha quente e finalização com pomada."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              {/* Preço e Duração */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Preço Normal (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="39.99"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Duração Estimada *</label>
                  <select 
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="15">15 minutos (Rápido / Sobrancelha)</option>
                    <option value="30">30 minutos (Padrão / Corte)</option>
                    <option value="45">45 minutos (Corte + Barba)</option>
                    <option value="60">1 hora (Completo / Barboterapia)</option>
                    <option value="75">1h 15min</option>
                    <option value="90">1h 30min (Química / Platinado)</option>
                    <option value="120">2 horas (Coloração / Tratamento)</option>
                  </select>
                </div>
              </div>

              {/* Bloco de Promoções e Descontos */}
              <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Ativar Preço Promocional</span>
                      <span className="text-[11px] text-zinc-400 block">Destaque com selo de promoção e preço riscado</span>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={isPromotional}
                    onChange={(e) => setIsPromotional(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer accent-amber-500"
                  />
                </div>

                {isPromotional && (
                  <div className="pt-2 border-t border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-amber-300 font-semibold block mb-1">Preço com Desconto (R$) *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          required={isPromotional}
                          value={promotionalPrice}
                          onChange={(e) => setPromotionalPrice(e.target.value)}
                          placeholder="Ex: 24.99"
                          className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex flex-col justify-center">
                        {discountPercent > 0 ? (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
                            <span className="text-[11px] text-amber-300 font-bold block">
                              Economia de R$ {(originalVal - promoVal).toFixed(2)}
                            </span>
                            <span className="text-xs font-extrabold text-amber-400">
                              {discountPercent}% OFF
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">
                            Digite um valor menor que o preço normal para calcular o desconto.
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1">Dias da Promoção (Opcional)</label>
                      <input 
                        type="text" 
                        value={promoDays}
                        onChange={(e) => setPromoDays(e.target.value)}
                        placeholder="Ex: Segunda a Quarta-feira"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Ativo */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 w-4 h-4 accent-emerald-500"
                />
                <span className="text-xs text-zinc-300">Serviço ativo para agendamento online no site</span>
              </label>

              {/* Botões do Modal */}
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
                  className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
