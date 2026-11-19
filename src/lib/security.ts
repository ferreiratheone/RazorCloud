// ==============================================================================
// MÓDULO DE SEGURANÇA FRONT-END: Anti-Cópia, Anti-Scraping e Proteção de Código
// ==============================================================================

/**
 * Inicializa os mecanismos de proteção contra cópia e inspeção no navegador.
 */
export function initClientSecurity() {
  if (typeof window === 'undefined') return;

  const isProduction = !((import.meta as any).env?.DEV);

  // 1. Bloqueio de Clique com o Botão Direito (Menu de Contexto)
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    // Permite seleção normal em inputs ou áreas de texto para o usuário digitar
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (isProduction) {
      e.preventDefault();
      return false;
    }
  });

  // 2. Bloqueio de Atalhos de Teclado de Inspeção e Cópia de Código
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!isProduction) return; // Permite atalhos no ambiente de desenvolvimento local

    const key = e.key.toUpperCase();
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    // F12 (Developer Tools)
    if (key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Option+I (Inspecionar Elemento)
    // Ctrl+Shift+J / Cmd+Option+J (Abrir Console)
    // Ctrl+Shift+C / Cmd+Option+C (Seletor de Elemento)
    if (isCtrlOrMeta && isShift && (key === 'I' || key === 'J' || key === 'C')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+Option+U (Exibir Código-Fonte da Página)
    if (isCtrlOrMeta && key === 'U') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Salvar Página no Computador)
    if (isCtrlOrMeta && key === 'S') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });

  // 3. Bloqueio de Arraste de Imagens (Prevenção de Download de Logos e Fotos)
  document.addEventListener('dragstart', (e: DragEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === 'IMG') {
      e.preventDefault();
      return false;
    }
  });
}

/**
 * Utilitário para renderização do Cloudflare Turnstile (Anti-Bot)
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function renderTurnstile(
  container: HTMLElement | string,
  siteKey: string,
  onVerify: (token: string) => void,
  onError?: () => void
): string | null {
  if (typeof window === 'undefined' || !window.turnstile) {
    return null;
  }

  try {
    return window.turnstile.render(container, {
      sitekey: siteKey,
      callback: onVerify,
      'error-callback': onError,
      theme: 'dark',
    });
  } catch (err) {
    console.warn('[TURNSTILE RENDER]', err);
    return null;
  }
}
