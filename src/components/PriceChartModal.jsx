import React, { useState, useEffect } from 'react';
import { fetchResourceHistory, fetchTokenHistory } from '../services/historyService';
import { t } from '../i18n';

const PriceChartModal = ({ resourceId, isToken = false, flowerPriceUsd = 0.05, currentLang = 'en', onClose }) => {
  const [timeframe, setTimeframe] = useState(30); // 7, 30, 90 dias
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const titleName = isToken ? '$FLOWER Token' : resourceId;
  const unitSymbol = isToken ? '$' : 'SFL';

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        let data = [];
        if (isToken) {
          data = await fetchTokenHistory(90, flowerPriceUsd);
        } else if (resourceId) {
          data = await fetchResourceHistory(resourceId, 90);
        }

        if (isMounted) {
          setHistory(data || []);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[PriceChartModal] Erro ao carregar histórico:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [resourceId, isToken, flowerPriceUsd]);

  // Filtra dados para a janela temporal selecionada (7, 30, 90 dias)
  const displayData = Array.isArray(history) ? history.slice(-timeframe) : [];

  // Verifica se há apenas 1 registro inicial (acumulando dados a partir de hoje)
  const isAccumulatingHistory = displayData.length <= 1 || displayData.every(d => d && d.isInitialData);

  // Métricas calculadas da janela selecionada com sanitização estrita de números
  const prices = displayData
    .map(d => Number(d.price_sfl ?? d.avg_price_sfl ?? d.price_usd ?? d.price ?? 0))
    .filter(p => !isNaN(p) && p > 0);

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

  // Médias móveis (exibidas como null / '-' se estiver acumulando dados iniciais)
  const latestItem = displayData.length > 0 ? displayData[displayData.length - 1] : null;
  const latestSma7 = (!isAccumulatingHistory && displayData.length >= 7 && latestItem)
    ? Number(latestItem.sma_7d_sfl ?? latestItem.sma_7d ?? 0)
    : null;

  const latestSma30 = (!isAccumulatingHistory && displayData.length >= 30 && latestItem)
    ? Number(latestItem.sma_30d_sfl ?? latestItem.sma_30d ?? 0)
    : null;

  // Cálculo de Coordenadas para Gráfico SVG Responsivo
  const svgWidth = 500;
  const svgHeight = 220;
  const padding = 25;

  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const yMin = minPrice > 0 ? minPrice * 0.95 : 0;
  const yMax = maxPrice > 0 ? maxPrice * 1.05 : 1;
  const yRange = (yMax - yMin) || 1;

  const getX = (index, total) => {
    if (total <= 1) return padding + chartWidth / 2;
    return padding + (index / (total - 1)) * chartWidth;
  };

  const getY = (val) => {
    const num = Number(val);
    if (isNaN(num) || yRange === 0) return padding + chartHeight / 2;
    const computed = svgHeight - padding - ((num - yMin) / yRange) * chartHeight;
    return isNaN(computed) ? padding + chartHeight / 2 : computed;
  };

  // Gerar Paths para o SVG
  const generatePath = (valKey) => {
    if (!displayData || displayData.length <= 1) return '';
    return displayData
      .map((d, i) => {
        const rawVal = d ? (d[valKey] ?? d.price_sfl ?? d.avg_price_sfl ?? d.price_usd ?? 0) : 0;
        const val = Number(rawVal);
        if (isNaN(val)) return '';
        const x = getX(i, displayData.length);
        const y = getY(val);
        if (isNaN(x) || isNaN(y)) return '';
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  const pricePath = generatePath('avg_price_sfl');
  const sma7Path = !isAccumulatingHistory ? generatePath('sma_7d_sfl') : '';
  const sma30Path = !isAccumulatingHistory ? generatePath('sma_30d_sfl') : '';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4">
        
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="text-base font-bold text-amber-400">
                {titleName} - {currentLang === 'pt' ? 'Histórico de Preços' : 'Price History'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentLang === 'pt' ? 'Série temporal & Médias Móveis (SMA)' : 'Time-series & Moving Averages (SMA)'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Seleção de Janela Temporal (7d, 30d, 90d) */}
        <div className="flex justify-between items-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
          <span className="text-xs text-slate-400 pl-2 font-semibold">
            {currentLang === 'pt' ? 'Período:' : 'Period:'}
          </span>
          <div className="flex items-center gap-1">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setTimeframe(days)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  timeframe === days 
                    ? 'bg-amber-400 text-slate-900 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>

        {/* Mensagem Limpa quando estiver acumulando histórico inicial */}
        {isAccumulatingHistory && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-center text-xs text-amber-300 flex items-center justify-center gap-1.5 font-medium">
            <span>ℹ️</span>
            <span>
              {currentLang === 'pt' 
                ? 'Coletando histórico diário. Dados acumulados a partir de hoje.' 
                : 'Collecting daily history. Data accumulated starting today.'}
            </span>
          </div>
        )}

        {/* Cards de Métricas (Preço Atual, SMA 7d, SMA 30d, Min/Max) */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">
              {currentLang === 'pt' ? 'Atual' : 'Latest'}
            </span>
            <span className="font-mono font-bold text-amber-400">
              {latestPrice ? `${latestPrice.toFixed(3)} ${unitSymbol}` : '-'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-amber-300 block font-semibold">SMA 7d</span>
            <span className="font-mono font-bold text-amber-300">
              {latestSma7 !== null ? `${latestSma7.toFixed(3)} ${unitSymbol}` : '-'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-indigo-300 block font-semibold">SMA 30d</span>
            <span className="font-mono font-bold text-indigo-300">
              {latestSma30 !== null ? `${latestSma30.toFixed(3)} ${unitSymbol}` : '-'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Mín / Máx</span>
            <span className="font-mono font-semibold text-slate-200 text-[11px] block">
              {minPrice ? `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}` : '-'}
            </span>
          </div>
        </div>

        {/* Gráfico SVG Responsivo com Tooltip ao passar o mouse */}
        <div className="relative bg-slate-950/70 rounded-2xl p-2 border border-slate-800 flex flex-col items-center">
          {loading ? (
            <div className="h-52 flex items-center justify-center text-xs text-amber-400 animate-pulse">
              ⚡ {currentLang === 'pt' ? 'Carregando histórico...' : 'Loading history...'}
            </div>
          ) : (
            <>
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-52 overflow-visible">
                {/* Linhas de Grade de Fundo */}
                <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
                <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
                <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

                {/* Curva de Preço Diário (Verde Esmeralda) */}
                {pricePath && (
                  <path d={pricePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                )}

                {/* Curva SMA 7d (Amarelo) */}
                {sma7Path && (
                  <path d={sma7Path} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" />
                )}

                {/* Curva SMA 30d (Índigo) */}
                {sma30Path && (
                  <path d={sma30Path} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="2 2" />
                )}

                {/* Pontos de Interação do Gráfico */}
                {displayData.map((d, i) => {
                  const val = d.avg_price_sfl || d.price_sfl || d.price_usd || 0;
                  const cx = getX(i, displayData.length);
                  const cy = getY(val);

                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r="5"
                      className="fill-emerald-400 hover:r-7 hover:fill-amber-400 transition-all cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  );
                })}
              </svg>

              {/* Tooltip Dinâmico ao passar o cursor */}
              {hoveredPoint && (
                <div className="absolute top-4 left-4 bg-slate-800/95 border border-slate-700 text-slate-100 text-xs px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md pointer-events-none">
                  <div className="font-semibold text-amber-400">{hoveredPoint.day || hoveredPoint.timestamp?.split('T')[0]}</div>
                  <div className="font-mono">Preço: {Number(hoveredPoint.val).toFixed(4)} {unitSymbol}</div>
                  {hoveredPoint.sma_7d_sfl && <div className="font-mono text-amber-300 text-[10px]">SMA 7d: {Number(hoveredPoint.sma_7d_sfl).toFixed(4)}</div>}
                  {hoveredPoint.sma_30d_sfl && <div className="font-mono text-indigo-300 text-[10px]">SMA 30d: {Number(hoveredPoint.sma_30d_sfl).toFixed(4)}</div>}
                </div>
              )}
            </>
          )}

          {/* Legenda do Gráfico */}
          <div className="flex justify-center items-center gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
              {currentLang === 'pt' ? 'Preço Diário' : 'Daily Price'}
            </span>
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <span className="w-2.5 h-0.5 bg-amber-300 inline-block"></span>
              SMA 7d
            </span>
            <span className="flex items-center gap-1 text-indigo-300 font-bold">
              <span className="w-2.5 h-0.5 bg-indigo-300 inline-block"></span>
              SMA 30d
            </span>
          </div>
        </div>

        {/* Botão de Fechar */}
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
