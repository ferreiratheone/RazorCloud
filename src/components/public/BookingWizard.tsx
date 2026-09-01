import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Scissors, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2, 
  Star, 
  Loader2, 
  MapPin, 
  Phone,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, Service, UserProfile, TimeSlot } from '@/src/types/database';

interface BookingWizardProps {
  slug?: string;
  onOpenDashboard?: () => void;
}

const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 40 : -40, opacity: 0 })
};

export default function RazorCloudBookingPage({ slug = 'minha-barbearia', onOpenDashboard }: BookingWizardProps) {
  // Estado de carregamento do Tenant & Dados
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);

  // Estado do Fluxo de Agendamento
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  
  // Estado das Seleções
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Dados do Cliente e Submissão
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gerar datas dos próximos 7 dias dinamicamente
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

  // Carregar Organização, Serviços e Barbeiros reais
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
          setProfessionals(teamList.filter(u => u.active !== false));
        }
      } catch (err) {
        console.error('Erro ao carregar dados do tenant:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTenantData();
  }, [slug]);

  // Recalcular horários disponíveis sempre que data, barbeiro ou serviço mudar
  useEffect(() => {
    async function fetchSlots() {
      if (!tenant || !selectedServiceId) return;
      const service = services.find(s => s.id === selectedServiceId);
      if (!service) return;

      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const targetDate = dateOptions[selectedDateIndex].rawDate;
        const slots = await DataService.getAvailableSlots({
          orgId: tenant.id,
          barberId: selectedProfessionalId === 'any' ? undefined : (selectedProfessionalId || undefined),
          serviceDuration: service.duration,
          targetDate,
        });
        setAvailableSlots(slots);
      } catch (e) {
        console.error('Erro ao calcular slots:', e);
      } finally {
        setLoadingSlots(false);
      }
    }

    if (step >= 3) {
      fetchSlots();
    }
  }, [tenant, selectedServiceId, selectedProfessionalId, selectedDateIndex, step, services, dateOptions]);

  const selectedService = services.find(s => s.id === selectedServiceId);
  const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);

  const nextStep = () => {
    setDirection(1);
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((prev) => prev - 1);
  };

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
    if (!tenant || !selectedService || !selectedSlot) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Determinar barbeiro se o cliente escolheu "Qualquer um"
      let barberId = selectedProfessionalId;
      if (!barberId || barberId === 'any') {
        barberId = professionals.length > 0 ? professionals[0].id : 'user-demo-1';
      }

      const startTime = new Date(selectedSlot.isoString);
      const endTime = new Date(startTime.getTime() + selectedService.duration * 60 * 1000);

      await DataService.createAppointment({
        organization_id: tenant.id,
        service_id: selectedService.id,
        user_id: barberId,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        price: selectedService.price,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro ao registrar seu agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Carregando barbearia...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4 text-center">
        <Scissors className="w-12 h-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Barbearia não encontrada</h2>
        <p className="text-zinc-400 max-w-sm mb-6">Verifique o endereço do link ou retorne ao início.</p>
      </div>
    );
  }

  // --- ETAPA 1: SELEÇÃO DE SERVIÇOS ---
  const renderStep1 = () => (
    <div className="space-y-3 w-full">
      {services.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl">
          <Scissors className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">Nenhum serviço cadastrado nesta barbearia.</p>
          <p className="text-zinc-500 text-sm mt-1">Acesse o painel para cadastrar os primeiros serviços.</p>
          {onOpenDashboard && (
            <button 
              onClick={onOpenDashboard}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Abrir Painel Administrativo
            </button>
          )}
        </div>
      ) : (
        services.map((service) => (
          <button
            key={service.id}
            id={`service-card-${service.id}`}
            onClick={() => {
              setSelectedServiceId(service.id);
              setTimeout(nextStep, 250);
            }}
            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group flex items-start justify-between
              ${selectedServiceId === service.id 
                ? 'bg-zinc-800/90 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/70 hover:border-zinc-700'
              }`}
          >
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <Scissors className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                <h3 className="font-medium text-zinc-100">{service.name}</h3>
              </div>
              {service.description && (
                <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{service.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="text-white font-semibold">R$ {Number(service.price).toFixed(2)}</span>
                <span className="text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {service.duration} min
                </span>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
              ${selectedServiceId === service.id ? 'border-white bg-white' : 'border-zinc-700 group-hover:border-zinc-500'}
            `}>
              {selectedServiceId === service.id && <CheckCircle2 className="w-4 h-4 text-black" />}
            </div>
          </button>
        ))
      )}
    </div>
  );

  // --- ETAPA 2: SELEÇÃO DE PROFISSIONAL ---
  const renderStep2 = () => (
    <div className="space-y-4 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Opção Sem Preferência */}
        <button
          onClick={() => {
            setSelectedProfessionalId('any');
            setTimeout(nextStep, 250);
          }}
          className={`flex flex-col items-center text-center p-5 rounded-2xl border transition-all duration-200
            ${selectedProfessionalId === 'any'
              ? 'bg-zinc-800/90 border-white/30' 
              : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/70'
            }`}
        >
          <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-zinc-300" />
          </div>
          <h3 className="font-medium text-zinc-100">Sem preferência</h3>
          <p className="text-xs text-zinc-400 mb-2">Primeiro horário disponível</p>
          <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">Automático</span>
        </button>

        {/* Lista Real de Barbeiros */}
        {professionals.map((prof) => (
          <button
            key={prof.id}
            id={`barber-card-${prof.id}`}
            onClick={() => {
              setSelectedProfessionalId(prof.id);
              setTimeout(nextStep, 250);
            }}
            className={`flex flex-col items-center text-center p-5 rounded-2xl border transition-all duration-200
              ${selectedProfessionalId === prof.id 
                ? 'bg-zinc-800/90 border-white/30' 
                : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/70'
              }`}
          >
            <div className="relative mb-3">
              {prof.avatar_url ? (
                <img 
                  src={prof.avatar_url} 
                  alt={prof.full_name} 
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700 aspect-square" 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 border-2 border-zinc-700">
                  {prof.full_name.substring(0, 2).toUpperCase()}
                </div>
              )}
              {selectedProfessionalId === prof.id && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                </div>
              )}
            </div>
            <h3 className="font-medium text-zinc-100">{prof.full_name}</h3>
            <p className="text-xs text-zinc-400 mb-2 capitalize">{prof.role === 'owner' ? 'Dono & Barbeiro' : 'Barbeiro'}</p>
            <div className="flex items-center gap-1 text-xs text-zinc-300 font-medium bg-zinc-800 px-2.5 py-1 rounded-full">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {prof.rating || 5.0}
            </div>
          </button>
        ))}
      </div>
      <div className="pt-2 flex justify-start">
        <button 
          onClick={prevStep} 
          className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors w-full sm:w-auto text-sm font-medium"
        >
          Voltar
        </button>
      </div>
    </div>
  );

  // --- ETAPA 3: DATA E HORÁRIO ---
  const renderStep3 = () => (
    <div className="w-full space-y-6">
      {/* Seletor Horizontal de Datas */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Selecione o Dia</label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {dateOptions.map((dateObj, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDateIndex(idx)}
              className={`min-w-[80px] flex flex-col items-center p-3 rounded-2xl border transition-all shrink-0
                ${selectedDateIndex === idx 
                  ? 'bg-white border-white text-zinc-950 font-semibold shadow-md' 
                  : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
            >
              <span className="text-xs uppercase mb-1">{dateObj.day}</span>
              <span className={`text-base font-bold ${selectedDateIndex === idx ? 'text-zinc-950' : 'text-zinc-100'}`}>
                {dateObj.date}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grade de Horários Dinâmicos */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" /> Horários Disponíveis
          </span>
          {loadingSlots && <span className="text-xs text-zinc-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Verificando agenda...</span>}
        </h4>

        {loadingSlots ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
            Carregando horários em tempo real...
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="p-6 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-2xl">
            <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-zinc-300 font-medium text-sm">Sem horários disponíveis neste dia</p>
            <p className="text-zinc-500 text-xs mt-1">A barbearia pode estar fechada ou todos os horários estão preenchidos. Tente outro dia!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availableSlots.map((slot, i) => (
              <button
                key={i}
                disabled={!slot.available}
                onClick={() => {
                  setSelectedSlot(slot);
                  setTimeout(nextStep, 250);
                }}
                className={`py-3 rounded-xl border text-sm font-medium transition-all duration-200
                  ${!slot.available 
                    ? 'opacity-30 cursor-not-allowed bg-zinc-900/20 border-zinc-800/30 text-zinc-600 line-through' 
                    : selectedSlot?.time === slot.time
                      ? 'bg-white border-white text-zinc-950 shadow-md font-semibold'
                      : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800'
                  }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 flex justify-start">
        <button 
          onClick={prevStep} 
          className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors w-full sm:w-auto text-sm font-medium"
        >
          Voltar
        </button>
      </div>
    </div>
  );

  // --- ETAPA 4: REVISÃO E DADOS DO CLIENTE ---
  const renderStep4 = () => {
    const dateObj = dateOptions[selectedDateIndex];
    const barberLabel = selectedProfessionalId === 'any' ? 'Primeiro Barbeiro Disponível' : (selectedProfessional?.full_name || 'Barbeiro');
    const isFormValid = clientName.trim().length >= 3 && clientPhone.trim().length >= 8;

    return (
      <div className="w-full space-y-6">
        {/* Resumo do Agendamento */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
            <div>
              <p className="text-xs text-zinc-400">Data e Horário</p>
              <p className="font-medium text-white text-base mt-0.5">
                {dateObj.day}, {dateObj.date} às <span className="text-emerald-400 font-semibold">{selectedSlot?.time}</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-zinc-300" />
            </div>
          </div>

          <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
            <div>
              <p className="text-xs text-zinc-400">Serviço Selecionado</p>
              <p className="font-medium text-white text-base mt-0.5">{selectedService?.name}</p>
              <p className="text-xs text-zinc-400">{selectedService?.duration} minutos de duração</p>
            </div>
            <p className="font-bold text-white text-lg">R$ {Number(selectedService?.price).toFixed(2)}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-200 border border-zinc-700">
              <User className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Profissional</p>
              <p className="font-medium text-white text-sm mt-0.5">{barberLabel}</p>
            </div>
          </div>
        </div>

        {/* Inputs do Cliente */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Dados para Confirmação
          </label>
          <input 
            type="text" 
            id="input-client-name"
            placeholder="Seu nome completo" 
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all text-sm"
          />
          <input 
            type="tel" 
            id="input-client-phone"
            placeholder="Seu WhatsApp com DDD: (11) 99999-9999" 
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all text-sm"
          />
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <button 
            onClick={prevStep} 
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Voltar
          </button>
          <button 
            onClick={handleConfirm} 
            id="btn-confirm-booking"
            disabled={!isFormValid || isSubmitting}
            className="flex-1 bg-white text-zinc-950 font-semibold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Registrando no Supabase...</>
            ) : !isFormValid ? (
              'Preencha seu Nome e WhatsApp'
            ) : (
              'Confirmar e Reservar Horário'
            )}
          </button>
        </div>
      </div>
    );
  };

  // --- TELA DE SUCESSO ---
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 max-w-md w-full text-center backdrop-blur-xl shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Agendamento Confirmado!</h2>
          <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
            Perfeito, <strong className="text-zinc-200">{clientName.split(' ')[0]}</strong>! Seu horário na <strong className="text-zinc-200">{tenant.name}</strong> foi salvo com sucesso.
          </p>
          <div className="p-4 bg-zinc-950 border border-zinc-800/60 rounded-xl text-left text-xs text-zinc-400 space-y-1 mb-6">
            <p><strong className="text-zinc-300">Serviço:</strong> {selectedService?.name}</p>
            <p><strong className="text-zinc-300">Data/Hora:</strong> {dateOptions[selectedDateIndex]?.day}, às {selectedSlot?.time}</p>
            <p><strong className="text-zinc-300">Valor:</strong> R$ {Number(selectedService?.price).toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => {
                setIsSuccess(false);
                setStep(1);
                setSelectedServiceId(null);
                setSelectedSlot(null);
              }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              Fazer outro agendamento
            </button>
            {onOpenDashboard && (
              <button 
                onClick={onOpenDashboard}
                className="w-full bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white font-medium py-2.5 rounded-xl transition-colors text-xs flex items-center justify-center gap-1"
              >
                Ir para o Painel do Barbeiro <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 flex flex-col items-center selection:bg-zinc-800 selection:text-white pb-12">
      {/* Top Banner de Navegação para Testes do SaaS */}
      {onOpenDashboard && (
        <div className="w-full bg-zinc-900/80 border-b border-zinc-800/60 px-4 py-2 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Vitrine Pública Multi-Tenant: <code className="text-zinc-200 font-mono">/{slug}</code></span>
          </div>
          <button 
            onClick={onOpenDashboard}
            className="flex items-center gap-1 text-zinc-200 hover:text-white font-medium bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors"
          >
            Acessar Painel B2B <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Header Premium do Tenant */}
      <header className="w-full max-w-2xl px-6 pt-8 pb-6 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 shadow-xl">
          <Scissors className="w-7 h-7 text-zinc-100" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">{tenant.name}</h1>
        {tenant.address && (
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {tenant.address}
          </p>
        )}
      </header>

      {/* Container Principal do Wizard */}
      <main className="w-full max-w-xl px-4 flex-1 flex flex-col justify-start">
        <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col">
          
          {/* Header de Progresso */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Passo {step} de 4</p>
              <h2 className="text-lg font-bold text-white">{getStepTitle()}</h2>
            </div>
            
            {/* Visual Steps */}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-white' : i < step ? 'w-2 bg-zinc-500' : 'w-2 bg-zinc-800'
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
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="w-full"
              >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
              </motion.div>
            </AnimatePresence>
          </div>
          
        </div>
      </main>
    </div>
  );
}
