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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-zinc-50 overflow-hidden">
        
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho do App com Logo Oficial */}
        <div className="flex items-center gap-4 mb-6 pt-1">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-700 shadow-xl flex items-center justify-center shrink-0">
            <img
              src="/logo.webp"
              alt="Fratres Barbearia"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Exclusivo Equipe
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1 leading-tight">
              Fratres Barbearia
            </h3>
            <p className="text-xs text-zinc-400">
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
            <div className="space-y-2.5 mb-6">
              <div className="flex items-start gap-3 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
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

              <div className="flex items-start gap-3 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
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

              <div className="flex items-start gap-3 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
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
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Como Instalar no iPhone (Safari):
                </div>

                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-3 p-2 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                      1
                    </div>
                    <p className="text-[11px] leading-tight">
                      Toque no botão <strong>Compartilhar</strong> <span className="inline-block px-1 py-0.5 bg-zinc-800 rounded text-[10px]">⎋ Compartilhar</span> na barra do Safari.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-2 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                      2
                    </div>
                    <p className="text-[11px] leading-tight">
                      Role as opções e toque em <strong>"Adicionar à Tela de Início"</strong> (ícone ➕).
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-2 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                      3
                    </div>
                    <p className="text-[11px] leading-tight">
                      Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto!
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-3 bg-white text-zinc-950 hover:bg-zinc-200 font-extrabold text-xs rounded-xl transition-all shadow-md mt-1"
                >
                  Entendi as Instruções
                </button>
              </div>
            ) : canInstall ? (
              /* Botão de Instalação Nativa (Android / Chrome / Edge) */
              <div className="space-y-2">
                <button
                  onClick={handleNativeInstall}
                  disabled={installing}
                  className="w-full py-3.5 bg-white text-zinc-950 hover:bg-zinc-200 font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] disabled:opacity-50"
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
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-center space-y-2">
                <p className="text-xs text-zinc-300">
                  Para instalar, abra as opções do seu navegador (<strong>três pontinhos ⋮</strong>) e clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-white transition-colors"
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
