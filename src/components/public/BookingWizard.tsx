import React, { useState, useEffect } from 'react';
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
  Crown
} from 'lucide-react';
import { DataService, getLocalDateString } from '@/src/lib/data-service';
import type { Organization, Service, UserProfile, TimeSlot, CustomerSubscription } from '@/src/types/database';

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
      // Ao invés de voltar para o admin ou sair, retrocede o passo do agendamento
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
  const dateOptions = React.useMemo(() => {
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
      });
    }
    return dates;
  }, []);

  // Carregar Dados da Barbearia
  useEffect(() => {
    async function loadTenantData() {
      setLoading(true);
      try {
        const org = await DataService.getOrganizationBySlug(slug);
        if (org) {
          setTenant(org);
          const [servList, teamList] = await Promise.all([
            DataService.getServices(org.id),
            DataService.getTeam(org.id),
          ]);
          setServices(servList.filter(s => s.active));
          
          const activeTeam = teamList.filter(u => u.active !== false);
          setProfessionals(activeTeam);

          if (activeTeam.length === 1) {
            setSelectedProfessionalId(activeTeam[0].id);
          }
        } else {
          setTenant(null);
        }
      } catch (err) {
        console.error('Erro ao carregar dados da barbearia:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTenantData();
  }, [slug]);

  // Verificar se o cliente possui Plano Mensal / Assinatura Ativa
  useEffect(() => {
    async function checkSub() {
      if (!tenant || !clientPhone || clientPhone.replace(/\D/g, '').length < 8) {
        setActiveSubscription(null);
        setIsSubBooking(false);
        return;
      }
      try {
        const sub = await DataService.checkClientSubscription(tenant.id, clientPhone);
        if (sub && sub.status === 'active' && sub.cuts_used < sub.cuts_total) {
          setActiveSubscription(sub);
          setIsSubBooking(true);
        } else {
          setActiveSubscription(sub || null);
          setIsSubBooking(false);
        }
      } catch (e) {
        setActiveSubscription(null);
      }
    }

    const timer = setTimeout(checkSub, 350);
    return () => clearTimeout(timer);
  }, [tenant?.id, clientPhone]);

  // Recalcular horários disponíveis
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
      const finalPrice = (activeSubscription && isSubBooking) ? 0 : selectedService.price;

      await DataService.createAppointment({
        organization_id: tenant.id,
        service_id: selectedService.id,
        user_id: barberId,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        price: finalPrice,
        is_subscription: Boolean(activeSubscription && isSubBooking),
      });

      // Debitar 1 corte do plano do assinante se aplicável
      if (activeSubscription && isSubBooking) {
        await DataService.useSubscriptionCut(activeSubscription.id, tenant.id);
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
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
          <Scissors className="w-8 h-8 text-zinc-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Barbearia não encontrada</h2>
        <p className="text-zinc-400 text-xs max-w-sm mb-6">
          Verifique se o link foi digitado corretamente ou contate o estabelecimento.
        </p>
      </div>
    );
  }

  // --- TELA DE SUCESSO DO AGENDAMENTO ---
  if (isSuccess && selectedService && selectedSlot) {
    const formattedDate = dateOptions[selectedDateIndex].date;
    const barberName = selectedProfessional ? selectedProfessional.full_name : (professionals[0]?.full_name || 'Barbeiro');
    const targetPhone = (selectedProfessional?.phone || tenant.phone || '').replace(/\D/g, '');
    
    const isVip = activeSubscription && isSubBooking;
    const whatsAppMessage = `💈 *Novo Agendamento Confirmado!*\n\n✂️ *Serviço:* ${selectedService.name}\n📅 *Data:* ${formattedDate} às ${selectedSlot.time}\n👤 *Cliente:* ${clientName.trim()}\n📱 *WhatsApp:* ${clientPhone.trim()}\n💈 *Profissional:* ${barberName}\n${isVip ? '👑 *Plano VIP:* Atendimento incluso no Plano Mensal\n' : ''}\nAgendamento realizado pelo site oficial da ${tenant.name}!`;
    
    const whatsappUrl = targetPhone 
      ? `https://wa.me/55${targetPhone}?text=${encodeURIComponent(whatsAppMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-zinc-800 selection:text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-6"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Agendamento Confirmado!</h2>
            <p className="text-xs text-zinc-400 mt-1.5">
              Seu horário foi reservado com sucesso na <strong className="text-white">{tenant.name}</strong>.
            </p>
          </div>

          {/* Resumo do Atendimento */}
          <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500">Serviço:</span>
              <span className="font-bold text-white">{selectedService.name}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500">Data e Horário:</span>
              <span className="font-bold text-emerald-400">{formattedDate} às {selectedSlot.time}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500">Profissional:</span>
              <span className="font-medium text-white">{barberName}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500">Cliente:</span>
              <span className="font-medium text-white">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Valor Estimado:</span>
              <span className="font-bold text-white">
                {isVip ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> R$ 0,00 (Incluso no Plano VIP)
                  </span>
                ) : (
                  `R$ ${Number(selectedService.price).toFixed(2)}`
                )}
              </span>
            </div>
          </div>

          {/* Botão de Envio para o WhatsApp do Barbeiro */}
          <div className="space-y-3 pt-1">
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <Share2 className="w-4 h-4" /> Enviar Comprovante no WhatsApp do Barbeiro
            </a>

            <button
              onClick={() => {
                setIsSuccess(false);
                setStep(1);
                setSelectedServiceId(null);
                setSelectedSlot(null);
              }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold py-3 rounded-xl transition-colors text-xs"
            >
              Fazer outro agendamento
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- ETAPA 1: ESCOLHA DO SERVIÇO ---
  const renderStep1 = () => (
    <div className="space-y-3 w-full">
      {hasRememberedClient && clientName && (
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-300">Olá, <strong className="text-white">{clientName}</strong>!</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Agendamento Rápido</span>
        </div>
      )}

      {services.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl">
          <Scissors className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-semibold text-xs">Nenhum serviço cadastrado ainda.</p>
          <p className="text-zinc-500 text-[11px] mt-1">Acesse o painel administrativo para cadastrar cortes e serviços.</p>
        </div>
      ) : (
        services.map((service) => (
          <button
            key={service.id}
            id={`service-card-${service.id}`}
            onClick={() => {
              setSelectedServiceId(service.id);
              if (isSingleBarber) {
                setSelectedProfessionalId(professionals[0]?.id || 'owner-user');
                setDirection(1);
                setStep(3); // Pula direto para Data e Horário
              } else {
                setDirection(1);
                setStep(2);
              }
            }}
            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between
              ${selectedServiceId === service.id 
                ? 'bg-zinc-800 border-white/40 shadow-sm' 
                : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
              }`}
          >
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <Scissors className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="font-bold text-sm text-zinc-100">{service.name}</h3>
              </div>
              {service.description && (
                <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{service.description}</p>
              )}
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-500" /> {service.duration} min
              </span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-base font-bold text-white block">
                R$ {Number(service.price).toFixed(2)}
              </span>
            </div>
          </button>
        ))
      )}
    </div>
  );

  // --- ETAPA 2: ESCOLHA DO PROFISSIONAL (SOMENTE SE HOUVER 2+ BARBEIROS) ---
  const renderStep2 = () => (
    <div className="space-y-3 w-full">
      {professionals.length > 1 && (
        <button
          onClick={() => {
            setSelectedProfessionalId('any');
            setDirection(1);
            setStep(3);
          }}
          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between
            ${selectedProfessionalId === 'any' 
              ? 'bg-zinc-800 border-white/40 shadow-sm' 
              : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
            }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Qualquer Profissional</h3>
              <p className="text-xs text-zinc-400">Primeiro horário livre com qualquer barbeiro disponível</p>
            </div>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
            ${selectedProfessionalId === 'any' ? 'border-white bg-white' : 'border-zinc-700'}
          `}>
            {selectedProfessionalId === 'any' && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
          </div>
        </button>
      )}

      {professionals.map((barber) => (
        <button
          key={barber.id}
          onClick={() => {
            setSelectedProfessionalId(barber.id);
            setDirection(1);
            setStep(3);
          }}
          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between
            ${selectedProfessionalId === barber.id 
              ? 'bg-zinc-800 border-white/40 shadow-sm' 
              : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
            }`}
        >
          <div className="flex items-center gap-3.5">
            {barber.avatar_url ? (
              <img 
                src={barber.avatar_url} 
                alt={barber.full_name} 
                className="w-11 h-11 rounded-xl object-cover border border-zinc-700 aspect-square" 
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300">
                {barber.full_name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm text-white">{barber.full_name}</h3>
              <p className="text-xs text-zinc-400 capitalize">{barber.role === 'owner' ? 'Proprietário' : 'Barbeiro'}</p>
            </div>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
            ${selectedProfessionalId === barber.id ? 'border-white bg-white' : 'border-zinc-700'}
          `}>
            {selectedProfessionalId === barber.id && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
          </div>
        </button>
      ))}

      <button
        onClick={() => {
          setDirection(-1);
          setStep(1);
        }}
        className="w-full text-xs text-zinc-400 hover:text-white py-2 flex items-center justify-center gap-1 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  );

  // --- ETAPA 3: ESCOLHA DA DATA E HORÁRIO ---
  const renderStep3 = () => (
    <div className="space-y-4 w-full">
      {/* Carrossel de Datas */}
      <div>
        <label className="text-xs text-zinc-400 font-semibold block mb-2">Selecione o Dia</label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {dateOptions.map((d, index) => (
            <button
              key={index}
              onClick={() => setSelectedDateIndex(index)}
              className={`flex-1 min-w-[64px] py-2.5 px-2 rounded-2xl border text-center transition-all shrink-0
                ${selectedDateIndex === index 
                  ? 'bg-white text-zinc-950 font-bold border-white shadow-md' 
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
            >
              <span className="text-[10px] uppercase font-bold block">{d.day}</span>
              <span className="text-xs block mt-0.5">{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grade de Horários */}
      <div>
        <label className="text-xs text-zinc-400 font-semibold block mb-2">Horários Disponíveis</label>
        
        {loadingSlots ? (
          <div className="py-12 text-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
            <p className="text-xs">Buscando horários livres...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-zinc-800 rounded-2xl">
            <Clock className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
            <p className="text-xs text-zinc-400">Sem horários livres nesta data.</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Por favor, escolha outro dia acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
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
              Valor: R$ 0,00 (Incluso)
            </span>
          </div>
        </div>
      )}

      {/* Resumo do Horário */}
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
        <div className="flex justify-between">
          <span className="text-zinc-500">Valor Total:</span>
          <span className="font-bold text-white">
            {activeSubscription && isSubBooking ? (
              <span className="text-amber-400 font-bold">R$ 0,00 (Plano VIP)</span>
            ) : (
              `R$ ${Number(selectedService?.price || 0).toFixed(2)}`
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
