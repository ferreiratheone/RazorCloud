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
  Check
} from 'lucide-react';
import { DataService, getLocalDateString } from '@/src/lib/data-service';
import type { Organization, Service, UserProfile, TimeSlot, CustomerSubscription, Product } from '@/src/types/database';

interface BookingWizardProps {
  slug?: string;
}

const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 25 : -25, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 25 : -25, opacity: 0 })
};

export default function RazorCloudBookingPage({ slug = 'ferreirabarber' }: BookingWizardProps) {
  // Estado do Estabelecimento & Dados
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Fluxo em Etapas (1: Serviço, 2: Profissional [se múltiplos], 3: Horário, 4: Confirmar)
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  
  // Escolhas do Cliente
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
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
        const raw = localStorage.getItem('razorcloud_client_info');
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
            id: 'org-main',
            name: 'Ferreira Barber',
            slug: 'ferreirabarber',
            address: 'Av. Paulista, 1000 - Jardins, São Paulo',
            phone: '(11) 99999-8888',
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

  // Carregar slots de horário disponíveis
  useEffect(() => {
    async function fetchSlots() {
      if (!tenant || !selectedServiceId) return;
      const service = services.find(s => s.id === selectedServiceId);
      if (!service) return;

      setLoadingSlots(true);
      try {
        const targetDate = dateOptions[selectedDateIndex].rawDate;
        const slots = await DataService.getAvailableSlots({
          orgId: tenant.id,
          barberId: selectedProfessionalId === 'any' ? undefined : (selectedProfessionalId || undefined),
          serviceDuration: service.duration,
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
  }, [tenant?.id, selectedServiceId, selectedProfessionalId, selectedDateIndex]);

  const selectedService = services.find(s => s.id === selectedServiceId);
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

  const baseServicePrice = (activeSubscription && isSubBooking) ? 0 : Number(selectedService?.price || 0);
  const finalTotalPrice = baseServicePrice + productsTotal;

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
      case 1: return "Escolha o Serviço";
      case 2: return "Escolha o Profissional";
      case 3: return "Data e Horário";
      case 4: return "Confirmar Agendamento";
      default: return "";
    }
  };

  const handleConfirm = async () => {
    if (!tenant || !selectedService || !selectedSlot || !clientName.trim() || !clientPhone.trim()) {
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
        localStorage.setItem('razorcloud_client_info', JSON.stringify({
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
      const endTime = new Date(startTime.getTime() + selectedService.duration * 60 * 1000);

      const createdAppointment = await DataService.createAppointment({
        organization_id: tenant.id,
        service_id: selectedService.id,
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
      });

      // Debitar 1 corte do plano do assinante se aplicável
      if (activeSubscription && isSubBooking) {
        await DataService.useSubscriptionCut(activeSubscription.id, tenant.id);
      }

      // Disparar WhatsApp Automático se habilitado na barbearia
      if (tenant.whatsapp_auto_enabled) {
        const cleanPhone = clientPhone.replace(/\D/g, '');
        const autoMsg = (tenant.whatsapp_msg_confirmation || 'Fala {cliente}! Seu agendamento foi confirmado para {data} às {horario} na {barbearia}. Te esperamos! ✂️')
          .replace('{cliente}', clientName.trim())
          .replace('{horario}', selectedSlot.time)
          .replace('{data}', dateOptions[selectedDateIndex].date)
          .replace('{barbearia}', tenant.name)
          .replace('{servico}', selectedService.name)
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
    
    const productsText = selectedProductsList.length > 0
      ? `\n🛍️ *Produtos Adicionais:*\n` + selectedProductsList.map(p => `• ${p.quantity}x ${p.product.name} (R$ ${(p.product.price * p.quantity).toFixed(2)})`).join('\n')
      : '';

    const priceText = activeSubscription && isSubBooking && productsTotal === 0
      ? 'R$ 0,00 (Incluso no Plano VIP)'
      : `R$ ${finalTotalPrice.toFixed(2)}`;

    const whatsappText = `💈 *Novo Agendamento Confirmado!*\n\n✂️ *Serviço:* ${selectedService?.name}\n💰 *Valor:* ${priceText}${productsText}\n📅 *Data:* ${dateOptions[selectedDateIndex]?.date} às ${selectedSlot?.time}\n👤 *Cliente:* ${clientName}\n📱 *WhatsApp:* ${clientPhone}\n💈 *Profissional:* ${barberName}\n\nAgendamento realizado pelo site oficial da ${tenant.name}!`;
    
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
            <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
              <span className="text-zinc-500">Serviço:</span>
              <span className="font-bold text-white">{selectedService?.name}</span>
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
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Share2 className="w-4 h-4" /> Enviar Comprovante no WhatsApp
            </a>

            <button
              onClick={() => {
                setIsSuccess(false);
                setStep(1);
                setSelectedServiceId(null);
                setSelectedProfessionalId(null);
                setSelectedSlot(null);
                setSelectedProductQuantities({});
              }}
              className="w-full text-zinc-500 hover:text-zinc-300 text-xs py-2 transition-colors"
            >
              Fazer Outro Agendamento
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center pb-2 text-[11px] text-zinc-600">
          Site desenvolvido por{' '}
          <a 
            href="https://instagram.com/ferreiraatheone" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-pink-400 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <Instagram className="w-3 h-3 text-pink-500" />
            @ferreiraatheone
          </a>
        </footer>
      </div>
    );
  }

  // --- ETAPA 1: ESCOLHA DO SERVIÇO ---
  const renderStep1 = () => (
    <div className="space-y-3 w-full">
      {services.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-xs">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        services.map((srv) => {
          const isSelected = selectedServiceId === srv.id;
          return (
            <button
              key={srv.id}
              onClick={() => {
                setSelectedServiceId(srv.id);
                setDirection(1);
                if (isSingleBarber) {
                  setSelectedProfessionalId(professionals[0]?.id || 'any');
                  setStep(3); // Pula direto para o horário
                } else {
                  setStep(2);
                }
              }}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between group
                ${isSelected 
                  ? 'bg-zinc-800/90 border-zinc-400 shadow-md ring-1 ring-white/20' 
                  : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
                }`}
            >
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-white group-hover:text-zinc-100">{srv.name}</h3>
                {srv.description && (
                  <p className="text-xs text-zinc-400 line-clamp-1">{srv.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <Clock className="w-3 h-3" />
                  <span>{srv.duration} min</span>
                </div>
              </div>

              <div className="text-right shrink-0 ml-3">
                <span className="font-bold text-sm text-emerald-400 block">
                  R$ {Number(srv.price).toFixed(2)}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold group-hover:text-white">
                  Escolher →
                </span>
              </div>
            </button>
          );
        })
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
        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between
          ${selectedProfessionalId === 'any' 
            ? 'bg-zinc-800 border-zinc-400 shadow-md ring-1 ring-white/20' 
            : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-800/60'
          }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white">Qualquer Profissional</h3>
            <p className="text-[10px] text-zinc-400">Primeiro horário disponível</p>
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
          className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between
            ${selectedProfessionalId === barber.id 
              ? 'bg-zinc-800 border-zinc-400 shadow-md ring-1 ring-white/20' 
              : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-800/60'
            }`}
        >
          <div className="flex items-center gap-3">
            {barber.avatar_url ? (
              <img src={barber.avatar_url} alt={barber.full_name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300">
                {barber.full_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-xs text-white">{barber.full_name}</h3>
              <p className="text-[10px] text-zinc-400 capitalize">{barber.role === 'owner' ? 'Especialista / Dono' : 'Barbeiro'}</p>
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
        className="w-full text-xs text-zinc-400 hover:text-white py-1 flex items-center justify-center gap-1 transition-colors mt-2"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar aos serviços
      </button>
    </div>
  );

  // --- ETAPA 3: DATA E HORÁRIO ---
  const renderStep3 = () => (
    <div className="space-y-4 w-full">
      {/* Seletor Horizontal de Dias */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
        {dateOptions.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDateIndex(idx)}
            className={`flex-1 min-w-[64px] py-3 px-2 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center
              ${selectedDateIndex === idx 
                ? 'bg-white text-zinc-950 font-bold border-white shadow-lg' 
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            <span className={`text-[10px] font-bold uppercase ${selectedDateIndex === idx ? 'text-zinc-950' : 'text-zinc-500'}`}>
              {opt.day}
            </span>
            <span className="text-xs font-bold mt-0.5">{opt.date}</span>
          </button>
        ))}
      </div>

      {/* Grade de Horários */}
      <div className="pt-2">
        <h3 className="text-xs font-bold text-zinc-300 mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-400" /> Horários Disponíveis
        </h3>

        {loadingSlots ? (
          <div className="py-10 text-center flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mb-2" />
            <p className="text-xs">Buscando horários livres...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-400">Nenhum horário disponível para esta data.</p>
            <p className="text-[10px] text-zinc-500 mt-1">Por favor, escolha outro dia acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {availableSlots.map((slot, idx) => (
              <button
                key={idx}
                disabled={!slot.available}
                onClick={() => {
                  setSelectedSlot(slot);
                  setDirection(1);
                  setStep(4);
                }}
                className={`py-2.5 rounded-xl text-xs font-semibold border transition-all
                  ${!slot.available 
                    ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600 line-through cursor-not-allowed' 
                    : selectedSlot?.time === slot.time
                      ? 'bg-emerald-500 text-zinc-950 font-bold border-emerald-400 shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700'
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
        className="w-full text-xs text-zinc-400 hover:text-white py-1 flex items-center justify-center gap-1 transition-colors"
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
              Corte: R$ 0,00 (Incluso)
            </span>
          </div>
        </div>
      )}

      {/* VITRINE DE PRODUTOS ADICIONAIS (UPSELL) */}
      {tenant.products_enabled !== false && products.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
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
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    qty > 0 
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-sm' 
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{prod.name}</p>
                      <p className="text-[11px] font-semibold text-purple-400">
                        + R$ {Number(prod.price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleProductQuantity(prod.id, 1)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold transition-colors flex items-center gap-1 border border-zinc-700"
                      >
                        <Plus className="w-3 h-3" /> Adicionar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => toggleProductQuantity(prod.id, -1)}
                          className="w-6 h-6 rounded bg-zinc-900 text-zinc-300 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-white px-1.5">{qty}</span>
                        <button
                          type="button"
                          onClick={() => toggleProductQuantity(prod.id, 1)}
                          className="w-6 h-6 rounded bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
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

      {/* Resumo do Horário e Valores */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex justify-between border-b border-zinc-800/60 pb-2">
          <span className="text-zinc-500">Serviço:</span>
          <span className="font-bold text-white">{selectedService?.name || 'Serviço'}</span>
        </div>
        <div className="flex justify-between border-b border-zinc-800/60 pb-2">
          <span className="text-zinc-500">Horário:</span>
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
          <span className="text-zinc-500">Valor Total:</span>
          <span className="font-bold text-white text-sm">
            {activeSubscription && isSubBooking && productsTotal === 0 ? (
              <span className="text-amber-400 font-bold">R$ 0,00 (Plano VIP)</span>
            ) : (
              `R$ ${finalTotalPrice.toFixed(2)}`
            )}
          </span>
        </div>
      </div>

      {/* Formulário do Cliente */}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-400 font-semibold block mb-1">Seu Nome Completo *</label>
          <input 
            type="text" 
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: Igor Nogueira"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 font-semibold block mb-1">Seu WhatsApp / Celular *</label>
          <input 
            type="tel" 
            required
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="(11) 99999-8888"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          {hasRememberedClient && (
            <span className="text-[10px] text-zinc-500 mt-1 block">
              ✓ Dados lembrados do seu último agendamento neste aparelho.
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-2 pt-2">
        <button
          onClick={handleConfirm}
          disabled={isSubmitting || !clientName.trim() || !clientPhone.trim()}
          className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando Horário...</>
          ) : (
            <>Finalizar Agendamento <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <button
          onClick={() => {
            setDirection(-1);
            setStep(3);
          }}
          className="w-full text-xs text-zinc-400 hover:text-white py-1.5 flex items-center justify-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Alterar Horário
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 flex flex-col items-center justify-between selection:bg-zinc-800 selection:text-white pb-6">
      
      {/* Header White-Label da Barbearia */}
      <header className="w-full max-w-xl px-6 pt-10 pb-6 flex flex-col items-center justify-center text-center">
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
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">{tenant.name}</h1>
        {tenant.address && (
          <p className="text-xs text-zinc-400 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> {tenant.address}
          </p>
        )}
        {tenant.phone && (
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-zinc-600 shrink-0" /> {tenant.phone}
          </p>
        )}
      </header>

      {/* Container Principal do Wizard */}
      <main className="w-full max-w-md px-4 flex-1 flex flex-col justify-start">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col">
          
          {/* Header de Progresso Dinâmico */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                Passo {currentDisplayStep} de {totalDisplaySteps}
              </p>
              <h2 className="text-base font-bold text-white">{getStepTitle()}</h2>
            </div>
            
            <div className="flex gap-1.5">
              {Array.from({ length: totalDisplaySteps }, (_, i) => i + 1).map((i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all duration-300 ${
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

      {/* Footer com Créditos do Desenvolvedor */}
      <footer className="w-full text-center pt-6 pb-2 text-[11px] text-zinc-500 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <span>© {tenant.name}</span>
        <span className="text-zinc-700">•</span>
        <span className="flex items-center gap-1 text-zinc-400">
          Site desenvolvido por{' '}
          <a 
            href="https://instagram.com/ferreiraatheone" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white hover:text-pink-400 font-semibold inline-flex items-center gap-1 transition-colors underline-offset-2 hover:underline"
          >
            <Instagram className="w-3.5 h-3.5 text-pink-500" />
            @ferreiraatheone
          </a>
        </span>
      </footer>
    </div>
  );
}
