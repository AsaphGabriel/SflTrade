import { useState, useEffect } from 'react';

export default function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstruction, setShowIOSInstruction] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando em modo standalone (PWA instalado)
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standaloneCheck);

    // Detecta se é iOS (Safari)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Evento do Chrome/Android para captura do prompt de instalação
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      console.log('[PWA] App instalado com sucesso!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Escolha do usuário:', outcome);
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstruction(true);
    } else {
      // Fallback para navegadores onde o evento não disparou ou foi dispensado anteriormente
      alert('Para instalar o atalho do app no seu celular/computador:\n\n1. Abra o menu do seu navegador (⋮ ou ⋯)\n2. Clique em "Adicionar à Tela Inicial" ou "Instalar Aplicativo".');
    }
  };

  return {
    isInstallable: isInstallable || (isIOS && !isStandalone),
    isStandalone,
    isIOS,
    showIOSInstruction,
    setShowIOSInstruction,
    promptInstall
  };
}
