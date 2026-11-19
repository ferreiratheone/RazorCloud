import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Scissors, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2, 
  Loader2, 
  MapPin, 
  Phone, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  ChevronLeft, 
  Share2, 
  Instagram,
  Crown,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Users,
  Flame,
  Tag,
  X
} from 'lucide-react';
import { DataService, getLocalDateString } from '@/src/lib/data-service';
import type { Organization, Service, UserProfile, TimeSlot, CustomerSubscription, Product, AppointmentAdditionalService } from '@/src/types/database';
import { APP_SERVICE_CATEGORIES, getNormalizedCategory, getCategoryBadge } from '@/src/lib/categories';

interface BookingWizardProps {
  slug?: string;
}

const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 25 : -25, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 25 : -25, opacity: 0 })
};

const WIZARD_CATEGORIES = [
  { id: 'all', label: 'Todos os Serviços', icon: '💈' },
  { id: 'Cabelo', label: 'Cabelo', icon: '✂️' },
  { id: 'Barba', label: 'Barba', icon: '🪒' },
  { id: 'Sobrancelha', label: 'Sobrancelha', icon: '✨' },
  { id: 'Coloração', label: 'Coloração', icon: '🎨' },
  { id: 'Combos', label: 'Combos & Promo', icon: '🔥' },
  { id: 'Outros', label: 'Outros Serviços', icon: '💈' }
];

export default function RazorCloudBookingPage({ slug = 'fratresbarbearia' }: BookingWizardProps) {
  // Estado do Estabelecimento & Dados
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Fluxo em Etapas (1: Serviços [Multi-Seleção], 2: Profissional [se múltiplos], 3: Horário, 4: Confirmar)
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  
  // Categoria ativa na Etapa 1
  const [wizardCategory, setWizardCategory] = useState<string>('all');

  // Escolhas do Cliente (Múltiplos Serviços: Corte + Barba + Sobrancelha, etc.)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Produtos Adicionados pelo Cliente (Upsell)
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>({});

  // Formulário & Memória do Cliente
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [hasRememberedClient, setHasRememberedClient] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<CustomerSubscription | null>(null);
  const [isSubBooking, setIsSubBooking] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSingleBarber = professionals.length <= 1;

  // Travar o botão "Voltar" do navegador para manter o cliente 100% dentro do fluxo de agendamento
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.history.pushState({ wizardStep: step }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (step > 1) {
        setDirection(-1);
        if (professionals.length <= 1 && step === 3) {
          setStep(1);
        } else {
          setStep((prev) => Math.max(1, prev - 1));
        }
        window.history.pushState({ wizardStep: step }, '', window.location.href);
      } else {
        window.history.pushState({ wizardStep: 1 }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [step, professionals.length]);

  // Carregar memória salva do cliente no dispositivo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('fratres_client_info') || localStorage.getItem('razorcloud_client_info');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.name) {
            setClientName(parsed.name);
            setHasRememberedClient(true);
          }
          if (parsed?.phone) {
            setClientPhone(parsed.phone);
          }
        }
      } catch (e) {}
    }
  }, []);

  // Inicializar widget do Cloudflare Turnstile se chave configurada na Etapa 4 (Confirmação)
  useEffect(() => {
    const siteKey = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY;
    if (step === 4 && siteKey && typeof window !== 'undefined') {
      let intervalId: any = null;
      let attempts = 0;

      const tryRender = () => {
        attempts++;
        const container = document.getElementById('cf-turnstile-container');
        if (container && (window as any).turnstile) {
          if (!container.hasChildNodes()) {
            try {
              (window as any).turnstile.render(container, {
                sitekey: siteKey,
                callback: (token: string) => {
                  setTurnstileToken(token);
                  setErrorMessage(null);
                },
                'expired-callback': () => {
                  setTurnstileToken(null);
                },
                theme: 'dark',
              });
            } catch (e) {
              console.warn('[TURNSTILE INIT]', e);
            }
          }
          if (intervalId) clearInterval(intervalId);
        } else if (attempts > 30 && intervalId) {
          clearInterval(intervalId);
        }
      };

      tryRender();
      if (!(window as any).turnstile || !document.getElementById('cf-turnstile-container')) {
        intervalId = setInterval(tryRender, 300);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [step]);

  // Gerar datas dos próximos 7 dias
  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayLabel = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : dayNames[d.getDay()];
      const dateFormatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
      dates.push({
        day: dayLabel,
        date: dateFormatted,
        rawDate: d,
        isoDate: getLocalDateString(d),
      });
    }
    return dates;
  }, []);

  // Carregar dados da Barbearia
  useEffect(() => {
    async function loadShopData() {
      setLoading(true);
      try {
        const org = await DataService.getOrganizationBySlug(slug);
        if (org) {
          setTenant(org);
          const [srvList, teamList, prodList] = await Promise.all([
            DataService.getServices(org.id),
            DataService.getTeam(org.id),
            DataService.getProducts(org.id),
          ]);
          setServices(srvList.filter(s => s.active));
          setProfessionals(teamList.filter(p => p.active !== false));
          setProducts(prodList.filter(p => p.active !== false));
        } else {
          // Fallback seguro
          const fallbackOrg: Organization = {
            id: '02f3cc71-2747-496b-a241-20dfbae56d32',
            name: 'Fratres Barbearia',
            slug: 'fratresbarbearia',
            address: 'R. Gen. Osório - Boa Vista, Limeira - SP, 13486-113',
            phone: '(19) 98170-4277',
            plans_enabled: true,
            products_enabled: true,
          };
          setTenant(fallbackOrg);
          const [srvList, teamList, prodList] = await Promise.all([
            DataService.getServices(fallbackOrg.id),
            DataService.getTeam(fallbackOrg.id),
            DataService.getProducts(fallbackOrg.id),
          ]);
          setServices(srvList.filter(s => s.active));
          setProfessionals(teamList.filter(p => p.active !== false));
          setProducts(prodList.filter(p => p.active !== false));
        }
      } catch (e) {
        console.error('Erro ao carregar dados da barbearia:', e);
      } finally {
        setLoading(false);
      }
    }

    loadShopData();
  }, [slug]);

  // Verificar se o cliente é assinante VIP do salão
  useEffect(() => {
    async function checkSubscription() {
      if (tenant && clientPhone.length >= 10) {
        const sub = await DataService.checkClientSubscription(tenant.id, clientPhone);
        if (sub && sub.cuts_used < sub.cuts_total) {
          setActiveSubscription(sub);
          setIsSubBooking(true);
        } else {
          setActiveSubscription(null);
          setIsSubBooking(false);
        }
      } else {
        setActiveSubscription(null);
        setIsSubBooking(false);
      }
    }

    const timer = setTimeout(checkSubscription, 300);
    return () => clearTimeout(timer);
  }, [clientPhone, tenant]);

  // Lista dos serviços selecionados
  const selectedServicesList = useMemo(() => {
    return services.filter(s => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  // Primeiro serviço (serviço principal da tabela)
  const primaryService = selectedServicesList[0] || null;

  // Duração total somando todos os serviços selecionados
  const totalServicesDuration = useMemo(() => {
    if (selectedServicesList.length === 0) return 30;
    return selectedServicesList.reduce((acc, s) => acc + (Number(s.duration) || 30), 0);
  }, [selectedServicesList]);

  // Carregar slots de horário disponíveis considerando a DURAÇÃO TOTAL de todos os serviços
  useEffect(() => {
    async function fetchSlots() {
      if (!tenant || selectedServicesList.length === 0) return;

      setLoadingSlots(true);
      try {
        const targetDate = dateOptions[selectedDateIndex].rawDate;
        const slots = await DataService.getAvailableSlots({
          orgId: tenant.id,
          barberId: selectedProfessionalId === 'any' ? undefined : (selectedProfessionalId || undefined),
          serviceDuration: totalServicesDuration,
          targetDate,
        });
        setAvailableSlots(slots);
      } catch (err) {
        console.error('Erro ao buscar slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [tenant?.id, selectedServicesList.length, totalServicesDuration, selectedProfessionalId, selectedDateIndex]);

  const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);

  // Lista de produtos selecionados
  const selectedProductsList = useMemo(() => {
    return Object.entries(selectedProductQuantities)
      .map(([id, qty]) => {
        const prod = products.find(p => p.id === id);
        return prod ? { product: prod, quantity: qty } : null;
      })
      .filter(Boolean) as { product: Product; quantity: number }[];
  }, [selectedProductQuantities, products]);

  const productsTotal = useMemo(() => {
    return selectedProductsList.reduce((acc, item) => acc + (Number(item.product.price) * item.quantity), 0);
  }, [selectedProductsList]);

  // Preço base dos serviços selecionados considerando promoções e plano VIP
  const baseServicesPrice = useMemo(() => {
    if (selectedServicesList.length === 0) return 0;
    return selectedServicesList.reduce((acc, s, index) => {
      // Se cliente VIP com corte incluso, o primeiro corte/serviço sai gratuito
      if (activeSubscription && isSubBooking && index === 0) {
        return acc;
      }
      const price = (s.is_promotional && s.promotional_price) 
        ? Number(s.promotional_price) 
        : Number(s.price);
      return acc + price;
    }, 0);
  }, [selectedServicesList, activeSubscription, isSubBooking]);

  // Serviços filtrados por categoria utilizando normalização inteligente
  const filteredServices = useMemo(() => {
    if (wizardCategory === 'all') return services;
    return services.filter(s => getNormalizedCategory(s) === wizardCategory);
  }, [services, wizardCategory]);

  const finalTotalPrice = baseServicesPrice + productsTotal;

  function toggleServiceSelection(srvId: string) {
    setSelectedServiceIds(prev => 
      prev.includes(srvId) 
        ? prev.filter(id => id !== srvId) 
        : [...prev, srvId]
    );
  }

  function toggleProductQuantity(prodId: string, delta: number) {
    setSelectedProductQuantities(prev => {
      const current = prev[prodId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      }
      return { ...prev, [prodId]: next };
    });
  }

  const totalDisplaySteps = isSingleBarber ? 3 : 4;
  const currentDisplayStep = isSingleBarber 
    ? (step === 1 ? 1 : step === 3 ? 2 : 3)
    : step;

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Escolha seus Serviços";
      case 2: return "Escolha o Profissional";
      case 3: return "Data e Horário";
      case 4: return "Confirmar Agendamento";
      default: return "";
    }
  };

  const handleConfirm = async () => {
    if (!tenant || !primaryService || !selectedSlot || !clientName.trim() || !clientPhone.trim()) {
      if (!selectedSlot) {
        setErrorMessage('Por favor, volte e selecione um horário de atendimento.');
      } else if (!clientName.trim()) {
        setErrorMessage('Por favor, informe seu nome completo.');
      } else if (!clientPhone.trim()) {
        setErrorMessage('Por favor, informe seu WhatsApp de contato.');
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Salvar memória do cliente no navegador
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fratres_client_info', JSON.stringify({
          name: clientName.trim(),
          phone: clientPhone.trim(),
        }));
      } catch (e) {}
    }

    try {
      let barberId = selectedProfessionalId;
      if (!barberId || barberId === 'any') {
        barberId = professionals.length > 0 ? professionals[0].id : 'owner-user';
      }

      const startTime = new Date(selectedSlot.isoString);
      const endTime = new Date(startTime.getTime() + totalServicesDuration * 60 * 1000);

      // Serviços adicionais além do principal
      const additionalServices: AppointmentAdditionalService[] = selectedServicesList.slice(1).map(s => ({
        id: s.id,
        name: s.name,
        price: (s.is_promotional && s.promotional_price) ? Number(s.promotional_price) : Number(s.price),
        duration: s.duration || 30
      }));

      await DataService.createAppointment({
        organization_id: tenant.id,
        service_id: primaryService.id,
        user_id: barberId,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        price: finalTotalPrice,
        is_subscription: Boolean(activeSubscription && isSubBooking),
        products: selectedProductsList.map(p => ({
          product_id: p.product.id,
          name: p.product.name,
          price: p.product.price,
          quantity: p.quantity,
        })),
        products_total: productsTotal,
        additional_services: additionalServices.length > 0 ? additionalServices : undefined,
        turnstile_token: turnstileToken || undefined,
      } as any);

      // Debitar 1 corte do plano do assinante se aplicável
      if (activeSubscription && isSubBooking) {
        await DataService.useSubscriptionCut(activeSubscription.id, tenant.id);
      }

      // Disparar WhatsApp Automático se habilitado na barbearia
      if (tenant.whatsapp_auto_enabled) {
        const cleanPhone = clientPhone.replace(/\D/g, '');
        const servicesText = selectedServicesList.map(s => s.name).join(' + ');
        const autoMsg = (tenant.whatsapp_msg_confirmation || 'Fala {cliente}! Seu agendamento foi confirmado para {data} às {horario} na {barbearia}. Te esperamos! ✂️')
          .replace('{cliente}', clientName.trim())
          .replace('{horario}', selectedSlot.time)
          .replace('{data}', dateOptions[selectedDateIndex].date)
          .replace('{barbearia}', tenant.name)
          .replace('{servico}', servicesText)
          .replace('{valor}', `R$ ${finalTotalPrice.toFixed(2)}`);

        DataService.sendAutomatedWhatsAppMessage({
          org: tenant,
          phone: cleanPhone,
          message: autoMsg,
        }).catch(err => console.warn('Erro ao disparar automação WhatsApp:', err));
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.warn('Erro ao registrar agendamento:', err);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
        <p className="text-zinc-400 text-xs">Carregando barbearia...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
          <Scissors className="w-6 h-6 text-zinc-400" />
        </div>
        <h1 className="text-lg font-bold text-white mb-1">Barbearia Não Encontrada</h1>
        <p className="text-xs text-zinc-400 max-w-sm">
          O link de agendamento pode estar incorreto ou a barbearia ainda não configurou seu endereço público.
        </p>
      </div>
    );
  }

  // --- TELA DE SUCESSO ---
  if (isSuccess) {
    const barberName = selectedProfessional?.full_name || 'Profissional';
    const cleanPhone = (tenant.phone || '').replace(/\D/g, '');
    const servicesText = selectedServicesList.map(s => s.name).join(' + ');
    
    const productsText = selectedProductsList.length > 0
      ? `\n🛍️ *Produtos Adicionais:*\n` + selectedProductsList.map(p => `• ${p.quantity}x ${p.product.name} (R$ ${(p.product.price * p.quantity).toFixed(2)})`).join('\n')
      : '';

    const priceText = activeSubscription && isSubBooking && productsTotal === 0 && selectedServicesList.length === 1
      ? 'R$ 0,00 (Incluso no Plano VIP)'
      : `R$ ${finalTotalPrice.toFixed(2)}`;

    const whatsappText = `💈 *Novo Agendamento Confirmado!*\n\n✂️ *Serviço(s):* ${servicesText} (${totalServicesDuration} min)\n💰 *Valor:* ${priceText}${productsText}\n📅 *Data:* ${dateOptions[selectedDateIndex]?.date} às ${selectedSlot?.time}\n👤 *Cliente:* ${clientName}\n📱 *WhatsApp:* ${clientPhone}\n💈 *Profissional:* ${barberName}\n\nAgendamento realizado pelo site oficial da ${tenant.name}!`;
    
    const whatsappUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappText)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-between p-4 selection:bg-zinc-800 selection:text-white">
        <div className="w-full max-w-md my-auto py-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Agendamento Confirmado!</h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Seu horário está reservado com sucesso na <strong>{tenant.name}</strong>.
            </p>
          </div>

          {/* Cartão do Comprovante */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 text-left text-xs space-y-3 shadow-xl backdrop-blur-md">
            <div>
              <span className="text-zinc-500 block mb-1.5 font-semibold uppercase text-[10px] tracking-wider">
                Serviço(s) Contratado(s):
              </span>
              <div className="space-y-1.5 border-b border-zinc-800/80 pb-2.5">
                {selectedServicesList.map((s, idx) => {
                  const isPromo = s.is_promotional && s.promotional_price;
                  const price = isPromo ? Number(s.promotional_price) : Number(s.price);
                  return (
                    <div key={s.id} className="flex justify-between items-center text-zinc-200">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <strong className="text-white">{s.name}</strong>
                        <span className="text-[10px] text-zinc-500">({s.duration} min)</span>
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {activeSubscription && isSubBooking && idx === 0 ? 'R$ 0,00 (VIP)' : `R$ ${price.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
              <span className="text-zinc-500">Tempo Total Estimado:</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" /> {totalServicesDuration} minutos
              </span>
            </div>

            {selectedProductsList.length > 0 && (
              <div className="border-b border-zinc-800/80 pb-2.5 space-y-1">
                <span className="text-zinc-500 block">Produtos para Retirar:</span>
                {selectedProductsList.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-zinc-300">
                    <span>{p.quantity}x {p.product.name}</span>
                    <span className="font-semibold text-purple-400">R$ {(p.product.price * p.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
              <span className="text-zinc-500">Data e Horário:</span>
              <span className="font-bold text-emerald-400">{dateOptions[selectedDateIndex]?.date} às {selectedSlot?.time}</span>
            </div>

            <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
              <span className="text-zinc-500">Profissional:</span>
              <span className="font-bold text-white">{barberName}</span>
            </div>

            <div className="flex justify-between pt-0.5">
              <span className="text-zinc-500">Valor Total:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {priceText}
              </span>
            </div>
          </div>

          {/* Botão de WhatsApp */}
          <div className="space-y-3 pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3.5 px-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Share2 className="w-4 h-4" /> Enviar Comprovante no WhatsApp
            </a>

            <button
              onClick={() => {
                setIsSuccess(false);
                setStep(1);
                setSelectedServiceIds([]);
                setSelectedProfessionalId(null);
                setSelectedSlot(null);
                setSelectedProductQuantities({});
              }}
              className="w-full min-h-[48px] text-zinc-400 hover:text-white text-xs font-semibold py-2.5 transition-colors active:scale-95 flex items-center justify-center"
            >
              Fazer Outro Agendamento
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center pb-2 text-[11px] text-zinc-600 flex items-center justify-center gap-2">
          <span>© {tenant.name}</span>
          <span className="text-zinc-700">•</span>
          <a href="/#/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            Acesso da Equipe
          </a>
        </footer>
      </div>
    );
  }

  // --- ETAPA 1: ESCOLHA DO SERVIÇO (MULTI-SELEÇÃO & CATEGORIAS) ---
  const renderStep1 = () => (
    <div className="space-y-4 w-full">
      {/* Barra de Filtro de Categorias (Carrossel Horizontal com Snap e Touch Targets) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-2 px-2 sm:mx-0 sm:px-0 max-w-full">
        {WIZARD_CATEGORIES.map(cat => {
          const isCatActive = wizardCategory === cat.id;
          const countSelectedInCat = services.filter(s => 
            selectedServiceIds.includes(s.id) && (cat.id === 'all' || getNormalizedCategory(s) === cat.id)
          ).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setWizardCategory(cat.id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 border shrink-0 snap-start active:scale-95 ${
                isCatActive
                  ? 'bg-white text-zinc-950 border-white shadow-md'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {countSelectedInCat > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isCatActive ? 'bg-zinc-900 text-white' : 'bg-emerald-500 text-zinc-950'
                }`}>
                  {countSelectedInCat}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dica de Multi-Seleção */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-[11px] sm:text-xs text-zinc-400 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Selecione 1 ou mais serviços para o mesmo atendimento</span>
        </span>
        {selectedServicesList.length > 0 && (
          <span className="font-bold text-emerald-400 shrink-0 text-xs">
            {selectedServicesList.length} marcado(s)
          </span>
        )}
      </div>

      {/* Bandeja de Serviços Já Marcados (Visual Rápido) */}
      {selectedServicesList.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
          <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">Selecionados:</span>
          {selectedServicesList.map(s => (
            <button 
              key={s.id}
              type="button"
              onClick={() => toggleServiceSelection(s.id)}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer hover:bg-emerald-500/20 active:scale-95 transition-all shrink-0 snap-start"
              title="Clique para remover"
            >
              <span>{s.name}</span>
              <X className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          ))}
        </div>
      )}

      {/* Lista de Serviços */}
      <div className="space-y-3 w-full">
        {filteredServices.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl p-6 text-zinc-500 text-xs">
            <Scissors className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
            Nenhum serviço encontrado nesta categoria.
          </div>
        ) : (
          filteredServices.map((srv) => {
            const isSelected = selectedServiceIds.includes(srv.id);
            const isPromo = srv.is_promotional && srv.promotional_price;
            const finalPrice = isPromo ? Number(srv.promotional_price) : Number(srv.price);

            return (
              <div
                key={srv.id}
                onClick={() => toggleServiceSelection(srv.id)}
                className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer select-none active:scale-[0.99]
                  ${isSelected 
                    ? 'bg-zinc-800/90 border-emerald-500/70 shadow-lg ring-1 ring-emerald-500/30' 
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
                  }`}
              >
                {/* Lado Esquerdo: Checkbox & Infos do Serviço */}
                <div className="flex items-start gap-3.5 min-w-0 pr-2">
                  {/* Checkbox estilizado com toque ampliado */}
                  <div className={`w-6 h-6 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                    isSelected 
                      ? 'bg-emerald-500 border-emerald-400 text-zinc-950 font-bold shadow-sm' 
                      : 'bg-zinc-950/60 border-zinc-700 text-transparent group-hover:border-zinc-500'
                  }`}>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                        <span>{getCategoryBadge(getNormalizedCategory(srv)).icon}</span>
                        <span>{getCategoryBadge(getNormalizedCategory(srv)).label.split('&')[0].trim()}</span>
                      </span>
                      {isPromo && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 text-amber-400" /> Promoção
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-zinc-100 truncate">
                      {srv.name}
                    </h3>
                    
                    {srv.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1">{srv.description}</p>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{srv.duration} min</span>
                      {isPromo && srv.promo_days && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[11px] text-amber-400 font-semibold">{srv.promo_days}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Valores */}
                <div className="text-right shrink-0">
                  {isPromo ? (
                    <div>
                      <span className="text-xs text-zinc-500 line-through block">
                        R$ {Number(srv.price).toFixed(2)}
                      </span>
                      <span className="font-extrabold text-base sm:text-lg text-amber-400 block">
                        R$ {finalPrice.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="font-extrabold text-base sm:text-lg text-emerald-400 block">
                      R$ {Number(srv.price).toFixed(2)}
                    </span>
                  )}
                  
                  <span className={`text-[11px] font-semibold mt-0.5 inline-block ${
                    isSelected ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}>
                    {isSelected ? '✓ Adicionado' : '+ Adicionar'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Barra Fixa Flutuante de Checkout quando há serviços selecionados */}
      {selectedServicesList.length > 0 ? (
        <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-7 sm:-mb-7 p-4 sm:p-5 bg-zinc-900/98 backdrop-blur-xl border-t border-zinc-800/90 flex items-center justify-between z-20 rounded-b-3xl shadow-2xl mt-5 safe-area-bottom">
          <div>
            <p className="text-xs text-zinc-400 font-medium">
              {selectedServicesList.length} {selectedServicesList.length === 1 ? 'serviço' : 'serviços'} • {totalServicesDuration} min
            </p>
            <p className="text-lg font-extrabold text-emerald-400">
              R$ {baseServicesPrice.toFixed(2)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDirection(1);
              if (isSingleBarber) {
                setSelectedProfessionalId(professionals[0]?.id || 'any');
                setStep(3); // Pula direto para o horário
              } else {
                setStep(2);
              }
            }}
            className="min-h-[48px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold px-6 py-3 rounded-2xl text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
          >
            Avançar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-center py-2 text-xs text-zinc-500">
          Selecione ao menos um serviço para prosseguir com o agendamento.
        </div>
      )}
    </div>
  );

  // --- ETAPA 2: ESCOLHA DO PROFISSIONAL ---
  const renderStep2 = () => (
    <div className="space-y-3 w-full">
      <button
        onClick={() => {
          setSelectedProfessionalId('any');
          setDirection(1);
          setStep(3);
        }}
        className={`w-full min-h-[56px] text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between active:scale-[0.98]
          ${selectedProfessionalId === 'any' 
            ? 'bg-zinc-800 border-zinc-400 shadow-md ring-1 ring-white/20' 
            : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/60'
          }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Qualquer Profissional</h3>
            <p className="text-xs text-zinc-400">Primeiro horário disponível</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-500" />
      </button>

      {professionals.map((barber) => (
        <button
          key={barber.id}
          onClick={() => {
            setSelectedProfessionalId(barber.id);
            setDirection(1);
            setStep(3);
          }}
          className={`w-full min-h-[56px] text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between active:scale-[0.98]
            ${selectedProfessionalId === barber.id 
              ? 'bg-zinc-800 border-zinc-400 shadow-md ring-1 ring-white/20' 
              : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/60'
            }`}
        >
          <div className="flex items-center gap-3">
            {barber.avatar_url ? (
              <img src={barber.avatar_url} alt={barber.full_name} className="w-11 h-11 rounded-xl object-cover border border-zinc-700 shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
                {barber.full_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm text-white">{barber.full_name}</h3>
              <p className="text-xs text-zinc-400 capitalize">{barber.role === 'owner' ? 'Especialista / Dono' : 'Barbeiro'}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-500" />
        </button>
      ))}

      <button
        onClick={() => {
          setDirection(-1);
          setStep(1);
        }}
        className="w-full min-h-[44px] text-xs sm:text-sm text-zinc-400 hover:text-white py-2 flex items-center justify-center gap-1.5 transition-colors mt-2 active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar aos serviços
      </button>
    </div>
  );

  // --- ETAPA 3: DATA E HORÁRIO ---
  const renderStep3 = () => (
    <div className="space-y-4 w-full">
      {/* Banner do Profissional Selecionado com Opção de Trocar */}
      {selectedProfessional && !isSingleBarber && (
        <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedProfessional.avatar_url ? (
              <img 
                src={selectedProfessional.avatar_url} 
                alt={selectedProfessional.full_name} 
                className="w-9 h-9 rounded-xl object-cover border border-zinc-700 aspect-square shrink-0" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
                {selectedProfessional.full_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Barbeiro Selecionado</p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">{selectedProfessional.full_name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDirection(-1);
              setStep(2);
            }}
            className="min-h-[36px] text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl transition-colors shrink-0 active:scale-95"
          >
            Trocar
          </button>
        </div>
      )}

      {/* Resumo rápido dos serviços selecionados */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm">
        <span className="text-zinc-400">
          {selectedServicesList.length} serviço(s) marcado(s):
        </span>
        <span className="font-bold text-white flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          {totalServicesDuration} min reservados
        </span>
      </div>

      {/* Seletor Horizontal de Dias (Carrossel com Snap e Touch Target Amplo) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 max-w-full scrollbar-none snap-x snap-mandatory -mx-2 px-2 sm:mx-0 sm:px-0">
        {dateOptions.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDateIndex(idx)}
            className={`min-w-[70px] sm:min-w-[76px] min-h-[58px] py-2.5 px-2 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center snap-start active:scale-95 shrink-0
              ${selectedDateIndex === idx 
                ? 'bg-white text-zinc-950 font-bold border-white shadow-lg' 
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            <span className={`text-[10px] font-bold uppercase ${selectedDateIndex === idx ? 'text-zinc-950' : 'text-zinc-500'}`}>
              {opt.day}
            </span>
            <span className="text-xs sm:text-sm font-bold mt-0.5">{opt.date}</span>
          </button>
        ))}
      </div>

      {/* Grade de Horários */}
      <div className="pt-2">
        <h3 className="text-xs sm:text-sm font-bold text-zinc-300 mb-2.5 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-zinc-400" /> Horários Disponíveis
        </h3>

        {loadingSlots ? (
          <div className="py-10 text-center flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
            <p className="text-xs sm:text-sm">Buscando horários com vaga de {totalServicesDuration} min...</p>
          </div>
        ) : availableSlots.length === 0 || availableSlots.filter(s => s.available).length === 0 ? (
          <div className="py-8 text-center border border-dashed border-zinc-800 rounded-2xl p-5 bg-zinc-950/40 space-y-3">
            <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-zinc-200">
                Sem horários livres {selectedProfessional ? `com ${selectedProfessional.full_name}` : ''} nesta data.
              </p>
              <p className="text-[11px] sm:text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Você pode selecionar outro dia acima ou verificar a disponibilidade de outros barbeiros da equipe.
              </p>
            </div>

            {!isSingleBarber && (
              <button
                type="button"
                onClick={() => {
                  setDirection(-1);
                  setStep(2);
                }}
                className="min-h-[44px] bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center gap-1.5 border border-zinc-700 shadow-sm active:scale-95"
              >
                <Users className="w-4 h-4 text-emerald-400" /> Ver Outros Barbeiros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {availableSlots.map((slot, idx) => (
              <button
                key={idx}
                disabled={!slot.available}
                onClick={() => {
                  setSelectedSlot(slot);
                  setDirection(1);
                  setStep(4);
                }}
                className={`min-h-[48px] py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center active:scale-95
                  ${!slot.available 
                    ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600 line-through cursor-not-allowed' 
                    : selectedSlot?.time === slot.time
                      ? 'bg-emerald-500 text-zinc-950 font-bold border-emerald-400 shadow-md ring-2 ring-emerald-400/20'
                      : 'bg-zinc-900/70 border-zinc-800/90 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setDirection(-1);
          if (isSingleBarber) {
            setStep(1);
          } else {
            setStep(2);
          }
        }}
        className="w-full min-h-[44px] text-xs sm:text-sm text-zinc-400 hover:text-white py-2 flex items-center justify-center gap-1.5 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  );

  // --- ETAPA 4: CONFIRMAÇÃO E DADOS ---
  const renderStep4 = () => (
    <div className="space-y-4 w-full">
      {/* Reconhecimento VIP se Assinante */}
      {activeSubscription && (
        <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Cliente VIP Reconhecido!</span>
            </div>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
              {activeSubscription.plan?.name || 'Plano Ativo'}
            </span>
          </div>

          <p className="text-xs text-zinc-300">
            Você já utilizou <strong>{activeSubscription.cuts_used} de {activeSubscription.cuts_total} cortes</strong> neste ciclo.
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
            <span className="text-[11px] text-emerald-400 font-semibold">
              ✨ Saldo restante: {Math.max(0, activeSubscription.cuts_total - activeSubscription.cuts_used)} corte(s)
            </span>
            <span className="text-xs font-bold text-amber-400">
              Corte Principal: R$ 0,00 (Incluso)
            </span>
          </div>
        </div>
      )}

      {/* VITRINE DE PRODUTOS ADICIONAIS (UPSELL) */}
      {tenant.products_enabled !== false && products.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              Deseja retirar algum produto no salão?
            </h4>
            <span className="text-[10px] text-zinc-500 font-medium">Opcional</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {products.map((prod) => {
              const qty = selectedProductQuantities[prod.id] || 0;
              return (
                <div 
                  key={prod.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    qty > 0 
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-sm' 
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">{prod.name}</p>
                      <p className="text-xs font-semibold text-purple-400">
                        + R$ {Number(prod.price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {prod.stock !== undefined && prod.stock <= 0 ? (
                      <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                        Esgotado
                      </span>
                    ) : qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleProductQuantity(prod.id, 1)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center gap-1 border border-zinc-700 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/30 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => toggleProductQuantity(prod.id, -1)}
                          className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-300 flex items-center justify-center hover:bg-zinc-800 transition-colors active:scale-90"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold text-white px-2">{qty}</span>
                        <button
                          type="button"
                          disabled={prod.stock !== undefined && qty >= prod.stock}
                          onClick={() => toggleProductQuantity(prod.id, 1)}
                          className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo do Horário e Valores com Todos os Serviços */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 text-xs sm:text-sm space-y-2.5">
        <div>
          <span className="text-zinc-500 block mb-1 font-semibold text-[10px] uppercase tracking-wider">
            Serviço(s) Contratado(s) ({selectedServicesList.length}):
          </span>
          <div className="space-y-1.5 border-b border-zinc-800/60 pb-2.5">
            {selectedServicesList.map((srv, idx) => {
              const isPromo = srv.is_promotional && srv.promotional_price;
              const price = isPromo ? Number(srv.promotional_price) : Number(srv.price);
              const isVipFree = activeSubscription && isSubBooking && idx === 0;

              return (
                <div key={srv.id} className="flex items-center justify-between text-zinc-300">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-bold text-white truncate">{srv.name}</span>
                    <span className="text-[10px] text-zinc-500">({srv.duration}m)</span>
                    {isPromo && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">
                        PROMO
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-zinc-200 shrink-0 ml-2">
                    {isVipFree ? (
                      <span className="text-amber-400">R$ 0,00 (VIP)</span>
                    ) : (
                      `R$ ${price.toFixed(2)}`
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between border-b border-zinc-800/60 pb-2 text-zinc-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" /> Duração total estimada:
          </span>
          <span className="font-bold text-white">{totalServicesDuration} min</span>
        </div>

        <div className="flex justify-between border-b border-zinc-800/60 pb-2">
          <span className="text-zinc-500">Data e Horário:</span>
          <span className="font-bold text-emerald-400">
            {dateOptions[selectedDateIndex]?.date} às {selectedSlot?.time || '--:--'}
          </span>
        </div>

        {selectedProductsList.length > 0 && (
          <div className="flex justify-between border-b border-zinc-800/60 pb-2">
            <span className="text-zinc-500">Produtos Adicionais:</span>
            <span className="font-bold text-purple-400">
              + R$ {productsTotal.toFixed(2)} ({selectedProductsList.reduce((acc, p) => acc + p.quantity, 0)} itens)
            </span>
          </div>
        )}

        <div className="flex justify-between pt-1">
          <span className="text-zinc-400 font-bold">Valor Total:</span>
          <span className="font-extrabold text-emerald-400 text-base">
            {activeSubscription && isSubBooking && productsTotal === 0 && selectedServicesList.length === 1 ? (
              <span className="text-amber-400 font-bold">R$ 0,00 (Plano VIP)</span>
            ) : (
              `R$ ${finalTotalPrice.toFixed(2)}`
            )}
          </span>
        </div>
      </div>

      {/* Formulário do Cliente com Altura 48px e Fonte 16px para iOS */}
      <div className="space-y-3.5">
        <div>
          <label className="text-xs sm:text-sm text-zinc-400 font-semibold block mb-1.5">Seu Nome Completo *</label>
          <input 
            type="text" 
            required
            autoComplete="name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: Igor Nogueira"
            className="w-full min-h-[48px] bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs sm:text-sm text-zinc-400 font-semibold block mb-1.5">Seu WhatsApp / Celular *</label>
          <input 
            type="tel" 
            inputMode="tel"
            autoComplete="tel"
            required
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="(19) 98170-4277"
            className="w-full min-h-[48px] bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />
          {hasRememberedClient && (
            <span className="text-[11px] sm:text-xs text-zinc-400 mt-1 block">
              ✓ Dados lembrados do seu último agendamento neste aparelho.
            </span>
          )}
        </div>

        {/* Widget Cloudflare Turnstile Anti-Robô (Carregado se VITE_TURNSTILE_SITE_KEY configurado) */}
        <div id="cf-turnstile-container" className="flex justify-center py-1" />
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-2 pt-2">
        <button
          onClick={handleConfirm}
          disabled={isSubmitting || !clientName.trim() || !clientPhone.trim()}
          className="w-full min-h-[52px] bg-white text-zinc-950 hover:bg-zinc-200 font-extrabold py-3.5 px-4 rounded-2xl text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Confirmando Horário...</>
          ) : (
            <>Finalizar Agendamento <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <button
          onClick={() => {
            setDirection(-1);
            setStep(3);
          }}
          className="w-full min-h-[44px] text-xs sm:text-sm text-zinc-400 hover:text-white py-2 flex items-center justify-center gap-1.5 transition-colors active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" /> Alterar Horário
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 flex flex-col items-center justify-between selection:bg-zinc-800 selection:text-white max-w-full overflow-x-hidden pb-[max(2rem,env(safe-area-inset-bottom))]">
      
      {/* Header White-Label da Barbearia com Safe Area Top */}
      <header className="w-full max-w-xl px-4 sm:px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-5 flex flex-col items-center justify-center text-center">
        {tenant.logo_url ? (
          <img 
            src={tenant.logo_url} 
            alt={tenant.name} 
            className="w-16 h-16 rounded-2xl object-cover mb-3 border border-zinc-800 shadow-xl"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 shadow-xl">
            <Scissors className="w-6 h-6 text-zinc-100" strokeWidth={1.5} />
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">{tenant.name}</h1>
        {tenant.address && (
          <p className="text-xs sm:text-sm text-zinc-400 flex items-center justify-center gap-1.5 px-2">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> {tenant.address}
          </p>
        )}
        {tenant.phone && (
          <p className="text-xs text-zinc-500 flex items-center justify-center gap-1 mt-1">
            <Phone className="w-3.5 h-3.5 text-zinc-600 shrink-0" /> {tenant.phone}
          </p>
        )}
      </header>

      {/* Container Principal do Wizard (sem overflow-hidden restritivo para permitir scroll natural fluido) */}
      <main className="w-full max-w-md px-3 sm:px-4 flex-1 flex flex-col justify-start">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-4 sm:p-7 backdrop-blur-xl relative shadow-2xl flex flex-col max-w-full">
          
          {/* Header de Progresso Dinâmico */}
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                Passo {currentDisplayStep} de {totalDisplaySteps}
              </p>
              <h2 className="text-base sm:text-lg font-bold text-white">{getStepTitle()}</h2>
            </div>
            
            <div className="flex gap-1.5">
              {Array.from({ length: totalDisplaySteps }, (_, i) => i + 1).map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentDisplayStep ? 'w-5 bg-white' : i < currentDisplayStep ? 'w-2 bg-zinc-500' : 'w-2 bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Animação dos Passos */}
          <div className="relative">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {step === 1 && renderStep1()}
                {step === 2 && !isSingleBarber && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
              </motion.div>
            </AnimatePresence>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center pt-8 pb-4 text-[11px] sm:text-xs text-zinc-500 flex flex-wrap items-center justify-center gap-2">
        <span>© {tenant.name}</span>
        <span className="text-zinc-700">•</span>
        <a 
          href="/#/admin" 
          className="text-zinc-500 hover:text-zinc-300 transition-colors py-1"
        >
          Acesso da Equipe
        </a>
      </footer>
    </div>
  );
}
