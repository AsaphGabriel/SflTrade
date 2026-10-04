import React from 'react';

export interface ChartPoint {
  day?: string;
  timestamp?: string;
  avg_price_sfl?: number;
  price_sfl?: number;
  price_usd?: number;
  price?: number;
  floor_sfl?: number;
  avg_floor_sfl?: number;
  isInitialData?: boolean;
}

interface PriceChartSVGProps {
  data: ChartPoint[];
  width?: number;
  height?: number;
  padding?: number;
  unitSymbol: string;
  currentLang: string;
  yAvg: number | null;
  avgPeriodPrice: number;
}

export const PriceChartSVG: React.FC<PriceChartSVGProps> = ({
  data,
  width = 800,
  height = 300,
  padding = 20,
  unitSymbol,
  currentLang,
  yAvg,
  avgPeriodPrice,
}) => {
  const [hoveredPoint, setHoveredPoint] = React.useState<ChartPoint & { x: number; y: number; val: number } | null>(null);

  if (!data || data.length === 0) return null;

  const getX = (index: number, total: number) => {
    if (total <= 1) return width / 2;
    return padding + (index / (total - 1)) * (width - padding * 2);
  };

  const prices = data
    .map(d => Number(d.price_sfl ?? d.avg_price_sfl ?? d.price_usd ?? d.price ?? 0))
    .filter(p => !isNaN(p) && isFinite(p) && p > 0);

  const minVal = prices.length ? Math.min(...prices) * 0.95 : 0;
  const maxVal = prices.length ? Math.max(...prices) * 1.05 : 1;

  const getY = (val: number) => {
    if (maxVal === minVal) return height / 2;
    return height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);
  };

  const generatePath = (valKey: keyof ChartPoint) => {
    if (data.length <= 1) return '';
    try {
      const points = data
        .map((d, i) => {
          if (!d) return null;
          const rawVal = d[valKey] ?? d.floor_sfl ?? d.avg_floor_sfl ?? d.price_sfl ?? d.avg_price_sfl ?? d.price_usd ?? 0;
          const val = Number(rawVal);
          if (isNaN(val) || !isFinite(val)) return null;
          const x = getX(i, data.length);
          const y = getY(val);
          if (isNaN(x) || !isFinite(x) || isNaN(y) || !isFinite(y)) return null;
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .filter(Boolean);
      return points.join(' ');
    } catch (err) {
      console.warn('[PriceChartSVG] Erro ao gerar path SVG:', err);
      return '';
    }
  };

  const pricePath = generatePath('avg_price_sfl');

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 overflow-visible">
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

        {yAvg !== null && isFinite(yAvg) && (
          <g>
            <line x1={padding} y1={yAvg} x2={width - padding} y2={yAvg} stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="6 3" />
            <text x={width - padding - 4} y={yAvg - 5} fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="end">
              {currentLang === 'pt' ? 'Média' : 'Avg'}: {avgPeriodPrice.toFixed(3)} {unitSymbol}
            </text>
          </g>
        )}

        {pricePath && <path d={pricePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />}

        {data.map((d, i) => {
          if (!d) return null;
          const val = Number(d.avg_price_sfl || d.price_sfl || d.price_usd || 0);
          const cx = getX(i, data.length);
          const cy = getY(val);
          if (isNaN(cx) || !isFinite(cx) || isNaN(cy) || !isFinite(cy)) return null;

          return (
            <g key={i}
              onMouseEnter={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}>
              <circle cx={cx} cy={cy} r="16" className="fill-transparent stroke-transparent cursor-pointer" />
              <circle cx={cx} cy={cy} r={hoveredPoint?.x === cx ? "6.5" : "4.5"} className={hoveredPoint?.x === cx ? "fill-amber-400" : "fill-emerald-400"} />
            </g>
          );
        })}
      </svg>

      {hoveredPoint && (
        <div className="absolute top-4 left-4 bg-slate-800/95 border border-slate-700 text-slate-100 text-xs px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md pointer-events-none z-10">
          <div className="font-semibold text-amber-400">{hoveredPoint.day || hoveredPoint.timestamp?.split('T')[0]}</div>
          <div className="font-mono">Preço: {Number(hoveredPoint.val).toFixed(4)} {unitSymbol}</div>
        </div>
      )}
      
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
  );
};
