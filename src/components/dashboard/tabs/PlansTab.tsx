import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Users, 
  Sparkles, 
  Wallet, 
  Calendar, 
  Phone, 
  MessageCircle, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Minus,
  Scissors
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, MembershipPlan, CustomerSubscription, UserProfile } from '@/src/types/database';

interface PlansTabProps {
  organization: Organization;
  onUpdateOrg: (org: Organization) => void;
  currentUser?: UserProfile;
}

export function PlansTab({ organization, onUpdateOrg, currentUser }: PlansTabProps) {
  const isOwner = !currentUser || currentUser.role === 'owner' || currentUser.role === 'admin';
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Modais
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  // Form State Plano
  const [planName, setPlanName] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planPrice, setPlanPrice] = useState('70.00');
  const [planCuts, setPlanCuts] = useState('2');

  // Form State Assinante
  const [subClientName, setSubClientName] = useState('');
  const [subClientPhone, setSubClientPhone] = useState('');
  const [subPlanId, setSubPlanId] = useState('');
  const [subRenewalDate, setSubRenewalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingPlans, setIsTogglingPlans] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [plansList, subsList] = await Promise.all([
        DataService.getPlans(organization.id),
        DataService.getSubscriptions(organization.id),
      ]);
      setPlans(plansList);
      setSubscriptions(subsList);
      if (plansList.length > 0 && !subPlanId) {
        setSubPlanId(plansList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [organization.id]);

  // Alternar se a barbearia trabalha ou não com planos
  async function handleTogglePlansEnabled() {
    if (isTogglingPlans) return;
    setIsTogglingPlans(true);
    try {
      const newVal = !(organization.plans_enabled ?? true);
      const updated = await DataService.updateOrganization({
        id: organization.id,
        plans_enabled: newVal,
      });
      onUpdateOrg(updated);
    } catch (e) {
      console.error('Erro ao alternar módulo de planos:', e);
    } finally {
      setIsTogglingPlans(false);
    }
  }

  // Métricas
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const totalMRR = activeSubs.reduce((acc, s) => {
    const plan = plans.find(p => p.id === s.plan_id);
    return acc + (plan?.price || 0);
  }, 0);
  const totalCutsUsed = activeSubs.reduce((acc, s) => acc + s.cuts_used, 0);

  // --- Ações de Planos ---
  function handleOpenCreatePlan() {
    setEditingPlan(null);
    setPlanName('');
    setPlanDesc('');
    setPlanPrice('80.00');
    setPlanCuts('2');
    setIsPlanModalOpen(true);
  }

  function handleOpenEditPlan(p: MembershipPlan) {
    setEditingPlan(p);
    setPlanName(p.name);
    setPlanDesc(p.description || '');
    setPlanPrice(String(p.price));
    setPlanCuts(String(p.cuts_per_month));
    setIsPlanModalOpen(true);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planName.trim()) return;

    setIsSaving(true);
    try {
      const priceNum = parseFloat(planPrice) || 0;
      const cutsNum = parseInt(planCuts) || 2;

      if (editingPlan) {
        await DataService.updatePlan(editingPlan.id, {
          name: planName.trim(),
          description: planDesc.trim() || undefined,
          price: priceNum,
          cuts_per_month: cutsNum,
        }, organization.id);
      } else {
        await DataService.createPlan({
          organization_id: organization.id,
          name: planName.trim(),
          description: planDesc.trim() || undefined,
          price: priceNum,
          cuts_per_month: cutsNum,
          active: true,
        });
      }

      setIsPlanModalOpen(false);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm('Deseja excluir este plano de assinatura?')) return;
    await DataService.deletePlan(id, organization.id);
    await loadData();
  }

  // --- Ações de Assinantes ---
  function handleOpenCreateSub() {
    if (plans.length === 0) {
      alert('Cadastre primeiro um plano mensal antes de adicionar assinantes.');
      handleOpenCreatePlan();
      return;
    }
    setSubClientName('');
    setSubClientPhone('');
    setSubPlanId(plans[0].id);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setSubRenewalDate(d.toISOString().split('T')[0]);
    setIsSubModalOpen(true);
  }

  async function handleSaveSub(e: React.FormEvent) {
    e.preventDefault();
    if (!subClientName.trim() || !subClientPhone.trim() || !subPlanId) return;

    setIsSaving(true);
    try {
      const chosenPlan = plans.find(p => p.id === subPlanId);
      const cutsTotal = chosenPlan?.cuts_per_month || 2;

      await DataService.createSubscription({
        organization_id: organization.id,
        plan_id: subPlanId,
        client_name: subClientName.trim(),
        client_phone: subClientPhone.trim(),
        cuts_used: 0,
        cuts_total: cutsTotal,
        renewal_date: subRenewalDate,
        status: 'active',
      });

      setIsSubModalOpen(false);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdjustCuts(sub: CustomerSubscription, delta: number) {
    const newUsed = Math.max(0, sub.cuts_used + delta);
    await DataService.updateSubscription(sub.id, { cuts_used: newUsed }, organization.id);
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, cuts_used: newUsed } : s));
  }

  async function handleRenewSubscription(sub: CustomerSubscription) {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextDate = nextMonth.toISOString().split('T')[0];

    await DataService.updateSubscription(sub.id, {
      cuts_used: 0,
      renewal_date: nextDate,
      status: 'active',
    }, organization.id);

    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, cuts_used: 0, renewal_date: nextDate, status: 'active' } : s));
  }

  async function handleDeleteSubscription(id: string) {
    if (!confirm('Deseja realmente remover este assinante?')) return;
    await DataService.deleteSubscription(id, organization.id);
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  }

  const isPlansEnabled = organization.plans_enabled ?? true;

  return (
    <div className="space-y-6">
      {/* Header com Toggle do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" /> Planos Mensais & Clube VIP
          </h2>
          <p className="text-xs text-zinc-400">
            Fidelize seus clientes com planos recorrentes de cortes e garanta receita fixa todo mês.
          </p>
        </div>

        {/* Chave Liga/Desliga ou Status */}
        {isOwner ? (
          <div className="flex items-center gap-3 bg-zinc-900/70 border border-zinc-800 px-4 py-2.5 rounded-2xl">
            <span className="text-xs font-medium text-zinc-300">
              {isPlansEnabled ? 'Clube de Planos Ativo' : 'Clube Desativado'}
            </span>
            <button
              onClick={handleTogglePlansEnabled}
              disabled={isTogglingPlans}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                isPlansEnabled ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isPlansEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-zinc-900/70 border border-zinc-800 px-3.5 py-2 rounded-2xl">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-emerald-400">
              {isPlansEnabled ? 'Clube Ativo no Salão' : 'Clube Desativado'}
            </span>
          </div>
        )}
      </div>

      {/* Cards de Métricas do Clube VIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Assinantes Ativos</span>
            <span className="text-xl font-bold text-white">{activeSubs.length} clientes</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Receita Mensal Recorrente</span>
            <span className="text-xl font-bold text-emerald-400">R$ {totalMRR.toFixed(2)}/mês</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Cortes Utilizados no Mês</span>
            <span className="text-xl font-bold text-white">{totalCutsUsed} cortes</span>
          </div>
        </div>
      </div>

      {/* Seção 1: Catálogo de Planos */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Opções de Planos Disponíveis
            </h3>
            <p className="text-xs text-zinc-400">Defina os valores e quantos cortes cada plano oferece no mês.</p>
          </div>

          <button
            onClick={handleOpenCreatePlan}
            className="bg-white text-zinc-950 hover:bg-zinc-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Novo Plano
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-800 rounded-2xl p-6 bg-zinc-950/40">
            <Crown className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Nenhum plano mensal cadastrado</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Crie planos de assinatura (ex: Quinzenal, VIP Semanal) para garantir receita recorrente todo mês.
            </p>
            <button 
              onClick={handleOpenCreatePlan}
              className="mt-4 bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Criar Primeiro Plano
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {plans.map((p) => (
            <div 
              key={p.id}
              className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 transition-all space-y-3 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {p.cuts_per_month === 999 ? 'Ilimitado' : `${p.cuts_per_month} Cortes/Mês`}
                  </span>
                  <h4 className="font-bold text-base text-white mt-1.5">{p.name}</h4>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenEditPlan(p)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(p.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {p.description && (
                <p className="text-xs text-zinc-400 line-clamp-2">{p.description}</p>
              )}

              <div className="pt-2 border-t border-zinc-800/80 flex items-baseline justify-between">
                <span className="text-xs text-zinc-500">Valor da Mensalidade</span>
                <span className="text-lg font-bold text-emerald-400">
                  R$ {Number(p.price).toFixed(2)}<span className="text-xs text-zinc-500 font-normal">/mês</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Seção 2: Gestão de Assinantes Ativos */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-400" /> Clientes Assinantes ({subscriptions.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Acompanhe o saldo de cortes utilizados e renovações de cada cliente do clube.
            </p>
          </div>

          <button
            onClick={handleOpenCreateSub}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar Assinante
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
            <p className="text-xs">Carregando assinantes...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl p-6">
            <Crown className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">Nenhum cliente assinante cadastrado ainda.</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Clique no botão acima para adicionar seu primeiro cliente no plano mensal!</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {subscriptions.map((sub) => {
              const plan = plans.find(p => p.id === sub.plan_id);
              const remainingCuts = Math.max(0, sub.cuts_total - sub.cuts_used);
              const cleanPhone = sub.client_phone.replace(/\D/g, '');
              const whatsappUrl = cleanPhone 
                ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(sub.client_name)}!%20Passando%20da%20${encodeURIComponent(organization.name)}%20para%20lembrar%20que%20voc%C3%AA%20ainda%20tem%20${remainingCuts}%20corte(s)%20dispon%C3%ADveis%20no%20seu%20plano%20este%20m%C3%AAs!` 
                : null;

              return (
                <div key={sub.id} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-zinc-900/20 px-2 rounded-xl transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0 mt-0.5">
                      {sub.client_name.substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{sub.client_name}</span>
                        <span className="text-[10px] bg-zinc-800 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                          {plan?.name || 'Plano VIP'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-500" /> {sub.client_phone}
                        </span>
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Calendar className="w-3 h-3" /> Vencimento: {new Date(sub.renewal_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contador de Cortes & Controle */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-zinc-800/60 pt-2 lg:pt-0">
                    <div className="flex items-center gap-3">
                      <div className="text-left lg:text-right">
                        <span className="text-xs font-bold text-white block">
                          {sub.cuts_used} de {sub.cuts_total} cortes usados
                        </span>
                        <span className="text-[11px] text-emerald-400 font-medium">
                          {remainingCuts} restantes
                        </span>
                      </div>

                      {/* Botões + / - Cortes */}
                      <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5">
                        <button
                          onClick={() => handleAdjustCuts(sub, -1)}
                          title="Estornar 1 corte"
                          className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-amber-400">{sub.cuts_used}</span>
                        <button
                          onClick={() => handleAdjustCuts(sub, 1)}
                          title="Debitar 1 corte realizado"
                          className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRenewSubscription(sub)}
                        title="Renovar Ciclo (+30 dias e zerar cortes)"
                        className="flex items-center gap-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 text-emerald-400" /> Renovar
                      </button>

                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Falar no WhatsApp"
                          className="p-1.5 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/20 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDeleteSubscription(sub.id)}
                        title="Cancelar Assinante"
                        className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
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

      {/* Modal Criar / Editar Plano */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {editingPlan ? 'Editar Plano Mensal' : 'Novo Plano de Assinatura'}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome do Plano *</label>
                <input 
                  type="text" 
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Ex: Plano VIP Gold"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Descrição / Benefícios</label>
                <textarea 
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  rows={2}
                  placeholder="Ex: 4 cortes de cabelo por mês + 10% de desconto em pomadas"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Valor Mensal (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="120.00"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Cortes no Mês *</label>
                  <input 
                    type="number" 
                    required
                    value={planCuts}
                    onChange={(e) => setPlanCuts(e.target.value)}
                    placeholder="4"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Assinante */}
      {isSubModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Cadastrar Novo Assinante VIP</h3>

            <form onSubmit={handleSaveSub} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome do Cliente *</label>
                <input 
                  type="text" 
                  required
                  value={subClientName}
                  onChange={(e) => setSubClientName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">WhatsApp / Telefone *</label>
                <input 
                  type="tel" 
                  required
                  value={subClientPhone}
                  onChange={(e) => setSubClientPhone(e.target.value)}
                  placeholder="(19) 99999-9999"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  O cliente usará este telefone para ter o desconto automático de assinante na hora de agendar.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Plano Escolhido *</label>
                  <select 
                    value={subPlanId}
                    onChange={(e) => setSubPlanId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (R$ {Number(p.price).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Data de Renovação</label>
                  <input 
                    type="date"
                    required
                    value={subRenewalDate}
                    onChange={(e) => setSubRenewalDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsSubModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cadastrar Assinante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
