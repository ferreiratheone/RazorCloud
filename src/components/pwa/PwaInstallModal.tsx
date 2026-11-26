import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { usePwaInstall } from '@/src/lib/pwa';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PwaInstallModal({ isOpen, onClose }: PwaInstallModalProps) {
  const { canInstall, isInstalled, isIOS, triggerInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  async function handleNativeInstall() {
    setInstalling(true);
    const success = await triggerInstall();
    setInstalling(false);
    if (success) {
      onClose();
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overflow-x-hidden animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative text-zinc-50 max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        {/* Barra puxadora para mobile (Bottom Sheet) */}
        <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho do App com Logo Oficial */}
        <div className="flex items-center gap-3.5 mb-5 pt-0 sm:pt-1 pr-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-700 shadow-xl flex items-center justify-center shrink-0">
            <img
              src="/logo.webp"
              alt="Fratres Barbearia"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Exclusivo Equipe
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-tight truncate">
              Fratres Barbearia
            </h3>
            <p className="text-xs text-zinc-400 truncate">
              Aplicativo de Gestão & Agenda
            </p>
          </div>
        </div>

        {/* Se já estiver instalado */}
        {isInstalled ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Aplicativo já instalado!</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Você já está utilizando a Fratres Barbearia no modo aplicativo em tela cheia com acesso direto.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-white transition-colors"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            {/* Benefícios para o Barbeiro */}
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-3 p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">1 Toque na Tela Inicial</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Abre direto na sua agenda diária sem precisar digitar o link no navegador.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tela Cheia de App Nativo</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Sem barras de endereço ou abas do navegador, com máxima área de visualização.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 sm:p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Seguro & Leve</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Não consome a memória do aparelho e mantém seu login salvo com segurança.
                  </p>
                </div>
              </div>
            </div>

            {/* Instruções para iOS (iPhone / iPad) */}
            {isIOS ? (
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-3 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Como Instalar no iPhone (Safari):
                </div>

                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-3 p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      1
                    </div>
                    <p className="text-[11px] leading-snug flex-1">
                      Toque no ícone <Share className="w-3.5 h-3.5 text-blue-400 inline mx-0.5 align-middle" /> <strong>Compartilhar</strong> na barra inferior do Safari.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      2
                    </div>
                    <p className="text-[11px] leading-snug flex-1">
                      Role as opções e toque em <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline mx-0.5 align-middle" /> <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      3
                    </div>
                    <p className="text-[11px] leading-snug flex-1">
                      Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 bg-white text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md mt-2 min-h-[44px]"
                >
                  Entendi as Instruções
                </button>
              </div>
            ) : canInstall ? (
              /* Botão de Instalação Nativa (Android / Chrome / Edge) */
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  disabled={installing}
                  className="w-full py-3.5 bg-white text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 min-h-[44px]"
                >
                  <Download className="w-4 h-4 text-zinc-950" />
                  {installing ? 'Instalando...' : 'Instalar Aplicativo Agora'}
                </button>
                <p className="text-[10px] text-center text-zinc-500">
                  Compatível com Android, Chrome e navegadores modernos.
                </p>
              </div>
            ) : (
              /* Fallback para Navegadores sem suporte a prompt automático */
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-center space-y-3">
                <p className="text-xs text-zinc-300">
                  Para instalar, abra as opções do seu navegador (<strong>três pontinhos ⋮</strong>) e clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-white transition-colors min-h-[44px]"
                >
                  Fechar
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// Botão / Pílula discreta para ser posicionada na barra lateral ou header
export function PwaInstallButton({
  className = '',
  variant = 'default',
}: {
  className?: string;
  variant?: 'default' | 'pill' | 'sidebar';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { isInstalled } = usePwaInstall();

  // Se já estiver no app instalado, não polui a tela
  if (isInstalled) return null;

  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-950/40 to-zinc-900 border border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60 hover:text-white transition-all shadow-sm group ${className}`}
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <span className="block leading-tight font-bold text-white text-[11px]">Baixar App Equipe</span>
            <span className="block leading-none text-[10px] text-zinc-400 mt-0.5 truncate">Instalar no Celular</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
        </button>
        <PwaInstallModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  if (variant === 'pill') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
        <PwaInstallModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span>Instalar no Celular</span>
      </button>
      <PwaInstallModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
