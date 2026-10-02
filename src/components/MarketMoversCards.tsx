// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { fetchMarketMovers, fetchNftMarketMovers } from '../services/historyService';
import { t } from '../i18n';
import { handleImageError, FALLBACK_SVG } from '../utils/imageFallback';

export interface MarketMoverItem {
  [key: string]: unknown;
  floor: number;
  resource?: string;
  name: string;
  changePct: number;
  image?: string;
  isNft?: boolean;
  collection?: string;
  nft_id: number;
  id: number;
  boost_text?: string;
  currentPrice?: number;
  basePrice?: number;
}

export interface MarketMoversData {
  topGainers: MarketMoverItem[];
  topLosers: MarketMoverItem[];
  hasData: boolean;
}

export interface MarketMoversCardsProps {
  marketData?: Record<string, unknown>;
  nftMarketData?: { list: { id: number; name: string; floor: number; resource?: string; [key: string]: unknown }[]; [key: string]: unknown };
  currentLang?: string;
  onSelectResource?: (resourceName: string, meta: MarketMoverItem | null) => void;
  activeCategory?: 'resources' | 'power_ups' | null;
  onCategoryChange?: ((cat: 'resources' | 'power_ups') => void) | null;
}

function getItemIcon(itemName: string) {
  if (!itemName) return FALLBACK_SVG;
  return `https://sfl.world/img/source/${encodeURIComponent(itemName)}.png`;
}

function formatarPreco(valor?: number | string | null) {
  if (valor === undefined || valor === null || isNaN(Number(valor))) return '0';
  const num = Number(valor);
  if (num === 0) return '0';
  if (num >= 10) return num.toFixed(2);
  if (num >= 1) return num.toFixed(3);
  return parseFloat(num.toPrecision(3)).toString();
}


interface MoverListCardProps {
  title: string;
  emoji: string;
  timeframe: string;
  items: MarketMoverItem[];
  loading: boolean;
  type: 'gainers' | 'losers';
  currentLang: string;
  onSelectResource?: (resourceName: string, meta: MarketMoverItem | null) => void;
  renderRankBadge: (index: number) => React.ReactNode;
}

const MoverListCard: React.FC<MoverListCardProps> = ({
  title,
  emoji,
  timeframe,
  items,
  loading,
  type,
  currentLang,
  onSelectResource,
  renderRankBadge
}) => {
  const isGainers = type === 'gainers';
  const colorClass = isGainers ? 'emerald' : 'rose';
  
  return (
    <div className={`bg-slate-800/60 border border-${colorClass}-500/25 hover:border-${colorClass}-500/40 rounded-2xl p-3.5 md:p-4 shadow-xl flex flex-col justify-between transition`}>
      <div>
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <h3 className={`text-sm font-bold text-${colorClass}-400 tracking-wide`}>
              {title}
            </h3>
          </div>
          <span className={`text-[10px] font-bold text-${colorClass}-300 bg-${colorClass}-500/15 border border-${colorClass}-500/30 px-2 py-0.5 rounded-full uppercase`}>
            {timeframe}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 py-1">
            {[1, 2, 3].map((i: number) => (
              <div key={i} className="h-14 bg-slate-700/30 rounded-xl animate-pulse border border-slate-700/20" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item: MarketMoverItem, idx: number) => {
              const isHighlight = isGainers ? item.changePct >= 0 : item.changePct < 0;
              return (
                <div
                  key={(item.resource || item.name || "")}
                  onClick={() => onSelectResource && onSelectResource((item.resource || item.name || ""), item)}
                  className={`bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-${colorClass}-500/50 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition group shadow-sm`}
                  title={t('clickToViewChart', currentLang)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderRankBadge(idx)}
                    <img
                      src={item.image || (item.isNft
                        ? (item.collection === 'wearables'
                            ? `https://sunflower-land.com/play/wearables/images/${item.nft_id || item.id}.png`
                            : `https://sunflower-land.com/play/erc1155/images/${item.nft_id || item.id}.webp`)
                        : getItemIcon((item.resource || item.name || "")))}
                      alt={(item.resource || item.name || "")}
                      className="w-8 h-8 object-contain drop-shadow image-rendering-pixelated shrink-0"
                      onError={handleImageError}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs md:text-sm font-bold text-slate-100 group-hover:text-${colorClass}-300 transition truncate`}>
                          {(item.resource || item.name || "")}
                        </span>
                        {item.boost_text && (
                          <span className="text-[9px] sm:text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0 max-w-[110px] truncate block" title={item.boost_text}>
                            {item.boost_text}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-200">
                          {item.isNft ? `${t('floorPrice', currentLang)}: ` : ''}{formatarPreco(item.currentPrice)} FLOWER
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          ({t('basePriceLabel', currentLang)} {formatarPreco(item.basePrice)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={`text-xs md:text-sm font-black px-2.5 py-1 rounded-lg border flex items-center gap-0.5 shadow-sm ${
                      isHighlight
                        ? `text-${colorClass}-400 bg-${colorClass}-500/15 border-${colorClass}-500/30`
                        : 'text-slate-300 bg-slate-800 border-slate-700'
                    }`}>
                      {item.changePct > 0 ? '▲ +' : (item.changePct < 0 ? '▼ ' : '')}{item.changePct}%
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
  );
};

const TIMEFRAMES = [
  { id: '24h', label: '24h' },
  { id: '7D', label: '7D' },
  { id: '30D', label: '30D' },
  { id: '90D', label: '90D' }
];

const MarketMoversCards: React.FC<MarketMoversCardsProps> = ({
  marketData = {},
  nftMarketData = { list: [] },
  currentLang = 'en',
  onSelectResource,
  activeCategory: externalActiveCategory = null,
  onCategoryChange = null
}) => {
  const [internalCategory, setInternalCategory] = useState<'resources' | 'power_ups'>('resources');
  const activeCategory = externalActiveCategory !== null && externalActiveCategory !== undefined
    ? externalActiveCategory
    : internalCategory;

  const handleCategorySwitch = (cat: 'resources' | 'power_ups') => {
    setInternalCategory(cat);
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
  };

  const [timeframe, setTimeframe] = useState('24h');
  const [moversData, setMoversData] = useState<MarketMoversData>({ topGainers: [], topLosers: [], hasData: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadMovers() {
      try {
        let data = null;
        if (activeCategory === 'power_ups') {
          data = await fetchNftMarketMovers((nftMarketData?.list || []) as any[], timeframe) as any;
        } else {
          data = await fetchMarketMovers(marketData, timeframe);
        }

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
  }, [marketData, nftMarketData, timeframe, activeCategory]);

  
  const { topGainers = [], topLosers = [] } = moversData;

  const renderRankBadge = (index: number) => {
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
      {/* Cabeçalho com Abas [Recursos | Power Ups] e Filtro de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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

          {/* Seletor de Categoria: [Recursos | Power Ups] */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 shadow-inner self-start sm:self-center">
            <button
              onClick={() => handleCategorySwitch('resources')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeCategory === 'resources'
                  ? 'bg-amber-400 text-slate-900 shadow-md scale-105'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
              }`}
            >
              {t('tabResources', currentLang)}
            </button>
            <button
              onClick={() => handleCategorySwitch('power_ups')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeCategory === 'power_ups'
                  ? 'bg-amber-400 text-slate-900 shadow-md scale-105'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
              }`}
            >
              {t('tabPowerUps', currentLang)}
            </button>
          </div>
        </div>

        {/* Seletor de Período (24h, 7D, 30D, 90D) */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <span className="text-[11px] font-semibold text-slate-400 pl-2 pr-1 hidden xs:inline">
            {t('timeframeLabel', currentLang)}
          </span>
          {TIMEFRAMES.map((tf: { id: string, label: string }) => {
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
        <MoverListCard
          title={t('topGainersTitle', currentLang)}
          emoji="🚀"
          timeframe={timeframe}
          items={topGainers}
          loading={loading}
          type="gainers"
          currentLang={currentLang}
          onSelectResource={onSelectResource}
          renderRankBadge={renderRankBadge}
        />

        
        <MoverListCard
          title={t('topLosersTitle', currentLang)}
          emoji="📉"
          timeframe={timeframe}
          items={topLosers}
          loading={loading}
          type="losers"
          currentLang={currentLang}
          onSelectResource={onSelectResource}
          renderRankBadge={renderRankBadge}
        />
      </div>
    </section>
  );
};

export default MarketMoversCards;
