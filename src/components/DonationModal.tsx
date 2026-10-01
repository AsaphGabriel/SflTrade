import React, { useState, useEffect } from 'react';
import { t } from '../i18n';

const WALLET_ADDRESS = '0xC0A82b833562D72C51aC2b66BF4C4AEF5B955222';
const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${WALLET_ADDRESS}`;

export default function DonationModal({ isOpen, onClose, currentLang = 'en' }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(WALLET_ADDRESS);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = WALLET_ADDRESS;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('[DonationModal] Falha ao copiar:', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 my-auto relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecalho */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-400">
                {t('donateModalTitle', currentLang)}
              </h3>
              <p className="text-xs text-slate-400">
                {t('donateModalSubtitle', currentLang)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title={t('donateClose', currentLang)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mensagem explicativa */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          {t('donateModalDesc', currentLang)}
        </p>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="bg-white p-2 rounded-xl shadow-inner mb-2">
            <img 
              src={QR_CODE_URL} 
              alt="QR Code" 
              className="w-36 h-36 object-contain"
              loading="lazy"
            />
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Scan via Metamask, Rabby, Ronin ou Coinbase Wallet
          </span>
        </div>

        {/* Campo do Endereco da Carteira */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            {t('donateAddressLabel', currentLang)}
          </label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
            <input
              type="text"
              readOnly
              value={WALLET_ADDRESS}
              className="bg-transparent text-xs font-mono text-amber-300 flex-1 outline-none select-all truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{t('donateCopyBtn', currentLang)}</span>
                </>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] text-emerald-400 font-medium animate-fadeIn">
              {t('donateCopied', currentLang)}
            </p>
          )}
        </div>

        {/* Redes e Tokens Suportados */}
        <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Redes Compatíveis (EVM):</span>
            <span className="text-[10px] text-amber-400 font-mono">Mesmo Endereço</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300">
              Base (ETH / FLOWER / USDC)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300">
              Polygon (POL / SFL)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              Ronin (RON / FLOWER)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/60 border border-slate-600 text-slate-300">
              Ethereum Mainnet
            </span>
          </div>
          <p className="text-[10px] text-slate-500 italic">
            {t('donateNetworksSupported', currentLang)}
          </p>
        </div>

        {/* Rodape do Modal */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700"
          >
            {t('donateClose', currentLang)}
          </button>
        </div>
      </div>
    </div>
  );
}
