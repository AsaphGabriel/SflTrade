import React, { useState, useEffect } from 'react';
import { fetchResourceHistory, fetchTokenHistory, fetchNftHistory } from '../services/historyService';
import { t } from '../i18n';
import { PriceChartSVG, ChartPoint } from './charts/PriceChartSVG';

export interface PriceChartModalProps {
  resourceId?: any;
  isToken?: boolean;
  flowerPriceUsd?: number;
  flowerPrice?: number;
  selectedCurrency?: string;
  currentLang?: string;
  onClose: () => void;
}

const PriceChartModal: React.FC<PriceChartModalProps> = ({ 
  resourceId, 
  isToken = false, 
  flowerPriceUsd = 0.05, 
   
  selectedCurrency = 'usd', 
  currentLang = 'en', 
  onClose 
}) => {
  const [timeframe, setTimeframe] = useState('30D');
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isNftObj = typeof resourceId === 'object' && resourceId !== null && (resourceId.isNft || resourceId.nft_id !== undefined || resourceId.floor !== undefined);
  const targetName = isNftObj
    ? (resourceId.displayName || resourceId.name || resourceId.resource || '')
    : (isToken ? '$FLOWER Token' : (typeof resourceId === 'string' ? resourceId : (resourceId?.resource || resourceId?.name || '')));
  const targetNftId = isNftObj ? (resourceId.nft_id ?? resourceId.id) : null;
  const targetBoost = isNftObj ? resourceId.boost_text : null;
  const targetFloor = isNftObj ? Number(resourceId.floor ?? resourceId.currentPrice ?? 0) : 0;
  const currentPriceRef = typeof resourceId === 'object' && resourceId !== null ? Number(resourceId.currentPrice || resourceId.price || 0) : 0;

  const titleName = targetName;
  const symbolMap: Record<string, string> = { usd: '$', brl: 'R$', eur: '€', sgd: 'S$', pol: 'POL' };
  const fiatSymbol = symbolMap[selectedCurrency] || '$';
  const unitSymbol = isToken ? fiatSymbol : 'FLOWER';

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        let data: ChartPoint[] = [];
        if (isToken) {
          data = await fetchTokenHistory(timeframe, flowerPriceUsd);
        } else if (isNftObj && targetNftId !== null) {
          data = await fetchNftHistory(targetNftId, timeframe, targetFloor, targetName);
        } else if (targetName) {
          data = await fetchResourceHistory(targetName, timeframe, currentPriceRef);
        }

        if (isMounted) {
          setHistory(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[PriceChartModal] Erro ao carregar histórico:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [timeframe, isToken, targetName, targetNftId, targetFloor, flowerPriceUsd, currentPriceRef, isNftObj]);

  let displayData = history;
  if (!isToken && !isNftObj) {
    const usdRate = flowerPriceUsd || 0.05;
    displayData = displayData.map((d: ChartPoint) => {
      if (!d) return d;
      const originalPriceSfl = Number(d.price_sfl ?? d.avg_price_sfl ?? 0);
      let calculatedPrice = originalPriceSfl;
      if (selectedCurrency !== 'usd' && d.price_usd && usdRate > 0) {
         calculatedPrice = (d.price_usd / usdRate);
      }
      return { ...d, avg_price_sfl: calculatedPrice, price_sfl: calculatedPrice };
    });
  }

  const isAccumulatingHistory = displayData.length <= 1 || displayData.every((d) => d && d.isInitialData);

  const prices = displayData
    .map((d) => Number(d?.price_sfl ?? d?.avg_price_sfl ?? d?.price_usd ?? d?.price ?? 0))
    .filter((p) => !isNaN(p) && isFinite(p) && p > 0);

  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const firstPrice = prices.length > 0 ? prices[0] : 0;
  const avgPeriodPrice = prices.length > 0
    ? prices.reduce((acc, curr) => acc + curr, 0) / prices.length
    : 0;

  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  let periodChangePct = 0;
  if (firstPrice > 0 && latestPrice > 0) {
    periodChangePct = ((latestPrice - firstPrice) / firstPrice) * 100;
  }

  const svgWidth = 800;
  const svgHeight = 300;
  const padding = 20;

  let yAvg: number | null = null;
  if (avgPeriodPrice > 0) {
    const minVal = minPrice * 0.95;
    const maxVal = maxPrice * 1.05;
    if (maxVal > minVal) {
      yAvg = svgHeight - padding - ((avgPeriodPrice - minVal) / (maxVal - minVal)) * (svgHeight - padding * 2);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-amber-400">
                  {titleName} - {currentLang === 'pt' ? (isNftObj ? 'Histórico de Floor Price' : 'Histórico de Preços') : (isNftObj ? 'Floor Price History' : 'Price History')}
                </h3>
                {targetBoost && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                    {targetBoost}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {currentLang === 'pt' ? 'Série temporal & Linha de Média Automática' : 'Time-series & Automatic Average Line'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: '24h', label: '24h' },
              { id: '7D', label: '7 Dias' },
              { id: '30D', label: '30 Dias' },
              { id: '90D', label: '90 Dias' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  timeframe.toUpperCase() === opt.id.toUpperCase() 
                    ? 'bg-amber-400 text-slate-900 shadow-md scale-105' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isAccumulatingHistory && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-center text-xs text-amber-300 flex items-center justify-center gap-1.5 font-medium">
            <span>ℹ️</span>
            <span>
              {currentLang === 'pt' 
                ? 'Coletando histórico do período. Dados acumulados a partir do banco global.' 
                : 'Collecting period history. Accumulated data from global database.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">{currentLang === 'pt' ? 'Atual' : 'Latest'}</span>
            <span className="font-mono font-bold text-emerald-400">{latestPrice ? `${latestPrice.toFixed(3)} ${unitSymbol}` : '-'}</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-amber-400 block font-semibold">{currentLang === 'pt' ? 'Média Período' : 'Period Avg'}</span>
            <span className="font-mono font-bold text-amber-400">{avgPeriodPrice ? `${avgPeriodPrice.toFixed(3)} ${unitSymbol}` : '-'}</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">{currentLang === 'pt' ? 'Variação' : 'Change'}</span>
            <span className={`font-mono font-bold ${periodChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {periodChangePct !== 0 ? `${periodChangePct >= 0 ? '+' : ''}${periodChangePct.toFixed(2)}%` : '0.00%'}
            </span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Mín / Máx</span>
            <span className="font-mono font-semibold text-slate-200 text-[11px] block">
              {minPrice ? `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}` : '-'}
            </span>
          </div>
        </div>

        <div className="relative bg-slate-950/70 rounded-2xl p-2 border border-slate-800 flex flex-col items-center">
          {loading ? (
            <div className="h-52 flex items-center justify-center text-xs text-amber-400 animate-pulse">
              ⚡ {currentLang === 'pt' ? 'Carregando histórico...' : 'Loading history...'}
            </div>
          ) : (
            <PriceChartSVG 
              data={displayData} 
              width={svgWidth} 
              height={svgHeight} 
              padding={padding} 
              unitSymbol={unitSymbol} 
              currentLang={currentLang} 
              yAvg={yAvg} 
              avgPeriodPrice={avgPeriodPrice} 
            />
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl text-xs transition border border-slate-700"
        >
          {t('btnCancel', currentLang)}
        </button>
      </div>
    </div>
  );
};

export default PriceChartModal;
