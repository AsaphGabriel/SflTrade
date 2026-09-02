import React, { useState, useEffect } from 'react';
import { fetchMarketMovers } from '../services/historyService';
import { t } from '../i18n';

const TRANSPARENT_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3C/svg%3E";

function getItemIcon(itemName) {
  if (!itemName) return TRANSPARENT_FALLBACK;
  return `https://sfl.world/img/source/${encodeURIComponent(itemName)}.png`;
}

function formatarPreco(valor) {
  if (valor === undefined || valor === null || isNaN(valor)) return '0';
  const num = Number(valor);
  if (num === 0) return '0';
  if (num >= 10) return num.toFixed(2);
  if (num >= 1) return num.toFixed(3);
  return parseFloat(num.toPrecision(3)).toString();
}

const TIMEFRAMES = [
  { id: '24h', label: '24h' },
  { id: '7D', label: '7D' },
  { id: '30D', label: '30D' },
  { id: '90D', label: '90D' }
];

const MarketMoversCards = ({ marketData = {}, currentLang = 'en', onSelectResource }) => {
  const [timeframe, setTimeframe] = useState('24h');
  const [moversData, setMoversData] = useState({ topGainers: [], topLosers: [], hasData: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadMovers() {
      try {
        const data = await fetchMarketMovers(marketData, timeframe);
        if (isMounted) {
          setMoversData(data || { topGainers: [], topLosers: [], hasData: false });
          setLoading(false);
        }
      } catch (err) {
        console.warn('[MarketMoversCards] Erro ao carregar destaques:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadMovers();

    return () => {
      isMounted = false;
    };
  }, [marketData, timeframe]);

  const { topGainers = [], topLosers = [], hasData = false } = moversData;

  const renderRankBadge = (index) => {
    const colors = [
      'bg-amber-400 text-slate-900 font-extrabold', // #1 Ouro
      'bg-slate-300 text-slate-900 font-bold',     // #2 Prata
      'bg-amber-700 text-amber-100 font-bold'      // #3 Bronze
    ];
    return (
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 shadow-sm ${colors[index] || 'bg-slate-700 text-slate-300'}`}>
        #{index + 1}
      </span>
    );
  };

  return (
    <section className="mb-6">
      {/* Cabeçalho do Bloco de Destaques com Filtro de Tempo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📈</span>
            <h2 className="text-base md:text-lg font-bold text-slate-100">
              {t('moversTitle', currentLang)}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {t('moversSubtitle', currentLang)}
          </p>
        </div>

        {/* Seletor de Período (24h, 7D, 30D, 90D) */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <span className="text-[11px] font-semibold text-slate-400 pl-2 pr-1 hidden xs:inline">
            {t('timeframeLabel', currentLang)}
          </span>
          {TIMEFRAMES.map(tf => {
            const isActive = timeframe === tf.id;
            return (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-amber-400 text-slate-900 shadow-md scale-105'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                }`}
                title={`${tf.label} ${t('timeframeLabel', currentLang)}`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade de 2 Cards: Maiores Altas e Maiores Baixas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        
        {/* CARD 1: 3 RECURSOS QUE MAIS VALORIZARAM */}
        <div className="bg-slate-800/60 border border-emerald-500/25 hover:border-emerald-500/40 rounded-2xl p-3.5 md:p-4 shadow-xl flex flex-col justify-between transition">
          <div>
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                <h3 className="text-sm font-bold text-emerald-400 tracking-wide">
                  {t('topGainersTitle', currentLang)}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
                {timeframe}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2 py-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-700/30 rounded-xl animate-pulse border border-slate-700/20" />
                ))}
              </div>
            ) : topGainers.length > 0 ? (
              <div className="space-y-2">
                {topGainers.map((item, idx) => {
                  const isPositive = item.changePct >= 0;
                  return (
                    <div
                      key={item.resource}
                      onClick={() => onSelectResource && onSelectResource(item.resource)}
                      className="bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/50 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition group shadow-sm"
                      title={t('clickToViewChart', currentLang)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {renderRankBadge(idx)}
                        <img
                          src={getItemIcon(item.resource)}
                          alt={item.resource}
                          className="w-8 h-8 object-contain drop-shadow image-rendering-pixelated shrink-0"
                          onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs md:text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition truncate">
                            {item.resource}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-200">
                              {formatarPreco(item.currentPrice)} SFL
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              ({t('basePriceLabel', currentLang)} {formatarPreco(item.basePrice)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-xs md:text-sm font-black px-2.5 py-1 rounded-lg border flex items-center gap-0.5 shadow-sm ${
                          isPositive
                            ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                            : 'text-slate-300 bg-slate-800 border-slate-700'
                        }`}>
                          {isPositive ? '▲ +' : '▼ '}{item.changePct}%
                        </span>
                        <span className="text-xs text-slate-500 group-hover:text-amber-400 transition hidden sm:inline">
                          📊
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 px-3 text-xs text-slate-400 italic">
                {t('noMoversData', currentLang)}
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: 3 RECURSOS QUE MAIS DESVALORIZARAM */}
        <div className="bg-slate-800/60 border border-rose-500/25 hover:border-rose-500/40 rounded-2xl p-3.5 md:p-4 shadow-xl flex flex-col justify-between transition">
          <div>
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔻</span>
                <h3 className="text-sm font-bold text-rose-400 tracking-wide">
                  {t('topLosersTitle', currentLang)}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase">
                {timeframe}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2 py-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-700/30 rounded-xl animate-pulse border border-slate-700/20" />
                ))}
              </div>
            ) : topLosers.length > 0 ? (
              <div className="space-y-2">
                {topLosers.map((item, idx) => {
                  const isNegative = item.changePct < 0;
                  return (
                    <div
                      key={item.resource}
                      onClick={() => onSelectResource && onSelectResource(item.resource)}
                      className="bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-rose-500/50 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition group shadow-sm"
                      title={t('clickToViewChart', currentLang)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {renderRankBadge(idx)}
                        <img
                          src={getItemIcon(item.resource)}
                          alt={item.resource}
                          className="w-8 h-8 object-contain drop-shadow image-rendering-pixelated shrink-0"
                          onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs md:text-sm font-bold text-slate-100 group-hover:text-rose-300 transition truncate">
                            {item.resource}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-200">
                              {formatarPreco(item.currentPrice)} SFL
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              ({t('basePriceLabel', currentLang)} {formatarPreco(item.basePrice)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-xs md:text-sm font-black px-2.5 py-1 rounded-lg border flex items-center gap-0.5 shadow-sm ${
                          isNegative
                            ? 'text-rose-400 bg-rose-500/15 border-rose-500/30'
                            : 'text-slate-300 bg-slate-800 border-slate-700'
                        }`}>
                          {item.changePct > 0 ? '▲ +' : '▼ '}{item.changePct}%
                        </span>
                        <span className="text-xs text-slate-500 group-hover:text-amber-400 transition hidden sm:inline">
                          📊
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 px-3 text-xs text-slate-400 italic">
                {t('noMoversData', currentLang)}
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};

export default MarketMoversCards;
