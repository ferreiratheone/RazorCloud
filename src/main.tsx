import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initClientSecurity } from './lib/security';
import { registerServiceWorker } from './lib/pwa';

// Inicializar blindagem anti-cópia e anti-inspeção
initClientSecurity();

// Registrar Service Worker para PWA
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
