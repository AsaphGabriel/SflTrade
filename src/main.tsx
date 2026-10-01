import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Registra o Service Worker e forca atualizacao imediata ao detectar nova versao
if ('serviceWorker' in navigator) {
  let refreshing = false;
  // Identifica se ja existia um SW ativo antes (se sim, e atualizacao; se nao, e primeira instalacao)
  const hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing && hadController) {
      refreshing = true;
      console.log('[PWA] Nova versao detectada. Atualizando aplicacao...');
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/SflTrade/sw.js', { scope: '/SflTrade/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado com sucesso no escopo:', registration.scope);
        registration.update();
      })
      .catch((error) => {
        console.error('[PWA] Falha ao registrar Service Worker:', error);
      });
  });
}