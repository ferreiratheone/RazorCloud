// ==============================================================================
// PWA HELPER & HOOK: Gestão de Instalação do PWA para Equipe e Barbeiros
// ==============================================================================

import { useState, useEffect } from 'react';

let deferredPrompt: any = null;
const listeners = new Set<() => void>();

// Ouvinte global para capturar o evento de instalação do Chrome / Android
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

// Registro seguro do Service Worker
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com sucesso:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });
    });
  }
}

// Verifica se a aplicação já está rodando em modo aplicativo nativo (Standalone)
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  return isStandaloneMedia || isIOSStandalone;
}

// Detecta se o dispositivo é iOS (iPhone / iPad / iPod)
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

// Hook React para componentes de instalação do PWA
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(Boolean(deferredPrompt));
  const [isInstalled, setIsInstalled] = useState<boolean>(isRunningStandalone());
  const [isIOS, setIsIOS] = useState<boolean>(isIOSDevice());

  useEffect(() => {
    function updateState() {
      setCanInstall(Boolean(deferredPrompt));
      setIsInstalled(isRunningStandalone());
      setIsIOS(isIOSDevice());
    }

    listeners.add(updateState);
    updateState();

    return () => {
      listeners.delete(updateState);
    };
  }, []);

  async function triggerInstall(): Promise<boolean> {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          deferredPrompt = null;
          setCanInstall(false);
          setIsInstalled(true);
          return true;
        }
      } catch (err) {
        console.warn('[PWA INSTALL ERROR]', err);
      }
    }
    return false;
  }

  return {
    canInstall,
    isInstalled,
    isIOS,
    triggerInstall,
  };
}
