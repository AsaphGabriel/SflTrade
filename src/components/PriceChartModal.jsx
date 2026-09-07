import React, { useState, useEffect } from 'react';
import { fetchResourceHistory, fetchTokenHistory } from '../services/historyService';
import { t } from '../i18n';

const PriceChartModal = ({ resourceId, isToken = false, flowerPriceUsd = 0.05, currentLang = 'en', onClose }) => {
  const [timeframe, setTimeframe] = useState('30D'); // '24h', '7D', '30D', '90D'
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
          data = await fetchTokenHistory(timeframe, flowerPriceUsd);
        } else if (resourceId) {
          data = await fetchResourceHistory(resourceId, timeframe);
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
  }, [resourceId, isToken, flowerPriceUsd, timeframe]);

  // Dados pre-agregados pela amostragem do período selecionado
  const displayData = Array.isArray(history) ? history : [];

  // Verifica se há apenas 1 registro inicial ou preenchido por fallback
  const isAccumulatingHistory = displayData.length <= 1 || displayData.every(d => d && d.isInitialData);

  // Métricas calculadas da janela selecionada com sanitização estrita de números
  const prices = displayData
    .map(d => Number(d?.price_sfl ?? d?.avg_price_sfl ?? d?.price_usd ?? d?.price ?? 0))
    .filter(p => !isNaN(p) && isFinite(p) && p > 0);

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

  // Cálculo da Média Automática do Período Exibido
  const avgPeriodPrice = prices.length > 0
    ? prices.reduce((acc, curr) => acc + curr, 0) / prices.length
    : 0;

  // Cálculo da Variação Percentual do Período (Primeiro Ponto -> Último Ponto)
  const firstPrice = prices.length > 0 ? prices[0] : 0;
  const periodChangePct = (firstPrice > 0 && latestPrice > 0)
    ? ((latestPrice - firstPrice) / firstPrice) * 100
    : 0;

  // Cálculo de Coordenadas para Gráfico SVG Responsivo
  const svgWidth = 500;
  const svgHeight = 220;
  const padding = 25;

  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const yMin = minPrice > 0 ? minPrice * 0.95 : 0;
  const yMax = maxPrice > 0 ? maxPrice * 1.05 : 1;
  const yRange = (isFinite(yMax - yMin) && (yMax - yMin) !== 0) ? (yMax - yMin) : 1;

  const getX = (index, total) => {
    if (!isFinite(index) || !isFinite(total) || total <= 1) return padding + chartWidth / 2;
    const x = padding + (index / (total - 1)) * chartWidth;
    return (isNaN(x) || !isFinite(x)) ? padding + chartWidth / 2 : x;
  };

  const getY = (val) => {
    const num = Number(val);
    if (isNaN(num) || !isFinite(num) || !isFinite(yRange) || yRange === 0) return padding + chartHeight / 2;
    const computed = svgHeight - padding - ((num - yMin) / yRange) * chartHeight;
    return (isNaN(computed) || !isFinite(computed)) ? padding + chartHeight / 2 : computed;
  };

  const yAvg = (avgPeriodPrice > 0) ? getY(avgPeriodPrice) : null;

  // Gerar Path para a linha de preço
  const generatePath = (valKey) => {
    if (!displayData || !Array.isArray(displayData) || displayData.length <= 1) return '';
    try {
      const points = displayData
        .map((d, i) => {
          if (!d) return null;
          const rawVal = d[valKey] ?? d.price_sfl ?? d.avg_price_sfl ?? d.price_usd ?? 0;
          const val = Number(rawVal);
          if (isNaN(val) || !isFinite(val)) return null;
          const x = getX(i, displayData.length);
          const y = getY(val);
          if (isNaN(x) || !isFinite(x) || isNaN(y) || !isFinite(y)) return null;
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .filter(Boolean);
      return points.join(' ');
    } catch (err) {
      console.warn('[PriceChartModal] Erro ao gerar path SVG:', err);
      return '';
    }
  };

  const pricePath = generatePath('avg_price_sfl');

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
                {currentLang === 'pt' ? 'Série temporal & Linha de Média Automática' : 'Time-series & Automatic Average Line'}
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

        {/* Seleção de Janela Temporal (24h, 7D, 30D, 90D) */}
        <div className="flex justify-between items-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
          <span className="text-xs text-slate-400 pl-2 font-semibold">
            {currentLang === 'pt' ? 'Período:' : 'Period:'}
          </span>
          <div className="flex items-center gap-1">
            {[
              { id: '24h', label: '24h' },
              { id: '7D', label: '7D' },
              { id: '30D', label: '30D' },
              { id: '90D', label: '90D' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  String(timeframe).toUpperCase() === opt.id.toUpperCase() 
                    ? 'bg-amber-400 text-slate-900 shadow-md scale-105' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {opt.label}
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
                ? 'Coletando histórico do período. Dados acumulados a partir do banco global.' 
                : 'Collecting period history. Accumulated data from global database.'}
            </span>
          </div>
        )}

        {/* Cards de Métricas (Preço Atual, Média do Período, Variação %, Min/Max) */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">
              {currentLang === 'pt' ? 'Atual' : 'Latest'}
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {latestPrice ? `${latestPrice.toFixed(3)} ${unitSymbol}` : '-'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-amber-400 block font-semibold">
              {currentLang === 'pt' ? 'Média Período' : 'Period Avg'}
            </span>
            <span className="font-mono font-bold text-amber-400">
              {avgPeriodPrice ? `${avgPeriodPrice.toFixed(3)} ${unitSymbol}` : '-'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">
              {currentLang === 'pt' ? 'Variação' : 'Change'}
            </span>
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

                {/* LINHA DE MÉDIA AUTOMÁTICA (Amarelo Dourado Tracejado) */}
                {yAvg !== null && isFinite(yAvg) && (
                  <g>
                    <line
                      x1={padding}
                      y1={yAvg}
                      x2={svgWidth - padding}
                      y2={yAvg}
                      stroke="#f59e0b"
                      strokeWidth="1.8"
                      strokeDasharray="6 3"
                    />
                    <text
                      x={svgWidth - padding - 4}
                      y={yAvg - 5}
                      fill="#f59e0b"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {currentLang === 'pt' ? 'Média' : 'Avg'}: {avgPeriodPrice.toFixed(3)} {unitSymbol}
                    </text>
                  </g>
                )}

                {/* Curva de Preço (Verde Esmeralda) */}
                {pricePath && (
                  <path d={pricePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                )}

                {/* Pontos de Interação do Gráfico */}
                {displayData.map((d, i) => {
                  if (!d) return null;
                  const val = Number(d.avg_price_sfl || d.price_sfl || d.price_usd || 0);
                  const cx = getX(i, displayData.length);
                  const cy = getY(val);
                  if (isNaN(cx) || !isFinite(cx) || isNaN(cy) || !isFinite(cy)) return null;

                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r="4.5"
                      className="fill-emerald-400 hover:r-6.5 hover:fill-amber-400 transition-all cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onTouchStart={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}
                    />
                  );
                })}
              </svg>

              {/* Tooltip Dinâmico ao passar o cursor */}
              {hoveredPoint && (
                <div className="absolute top-4 left-4 bg-slate-800/95 border border-slate-700 text-slate-100 text-xs px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md pointer-events-none z-10">
                  <div className="font-semibold text-amber-400">{hoveredPoint.day || hoveredPoint.timestamp?.split('T')[0]}</div>
                  <div className="font-mono">Preço: {Number(hoveredPoint.val).toFixed(4)} {unitSymbol}</div>
                </div>
              )}
            </>
          )}

          {/* Legenda do Gráfico */}
          <div className="flex justify-center items-center gap-6 mt-2 text-[10px] flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
              {currentLang === 'pt' ? 'Preço' : 'Price'}
            </span>
            <span className="flex items-center gap-1.5 text-amber-500 font-bold">
              <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
              {currentLang === 'pt' ? 'Média Automática' : 'Auto Average'}
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
