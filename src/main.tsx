import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initClientSecurity } from './lib/security';

// Inicializar blindagem anti-cópia e anti-inspeção
initClientSecurity();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
