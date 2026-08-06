import React from 'react';
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

const PortfolioTable = ({ data = [], currentLang = 'en', onOpenSell }) => {
  // Estado quando não há recursos em estoque
  if (!data || data.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
          {t('portfolioTitle', currentLang)}
        </h2>
        <div className="bg-cardbg rounded-2xl p-6 border border-slate-800 text-center text-slate-500 text-xs shadow-lg">
          {t('emptyPortfolio', currentLang)}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
        {t('portfolioTitle', currentLang)}
      </h2>

      {/* Visão Mobile (< md): Cards Individuais */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {data.map(item => {
          const corLucro = item.lucroAbsoluto >= 0 ? 'text-emerald-400' : 'text-rose-400';
          const iconUrl = getItemIcon(item.nome);

          return (
            <div key={item.nome} className="bg-cardbg rounded-xl p-3.5 border border-slate-800 shadow-md flex flex-col gap-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <img
                    src={iconUrl}
                    alt={item.nome}
                    className="w-6 h-6 rounded-sm object-cover align-middle inline-block"
                    onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-100">{item.nome}</span>
                    <span className="text-xs text-slate-400 font-mono block">x{formatarPreco(item.qty)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenSell && onOpenSell(item.nome)}
                  className="bg-rose-950/80 hover:bg-rose-600/30 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-800/60 transition"
                >
                  🔴 {t('cardSell', currentLang)}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('thTotalCost', currentLang)}</span>
                  <span className="font-mono text-slate-200">{formatarPreco(item.custoTotal)} SFL</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('thAvgPrice', currentLang)}</span>
                  <span className="font-mono text-slate-300">{formatarPreco(item.precoMedio)} SFL</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('thNetValue', currentLang)}</span>
                  <span className="font-mono text-slate-100 font-semibold">{formatarPreco(item.valorVendaLiquidoTotal)} SFL</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('thP2pPrice', currentLang)}</span>
                  <span className="font-mono text-amber-400 font-semibold">{item.precoP2P > 0 ? formatarPreco(item.precoP2P) + ' SFL' : 'N/A'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">{t('thEstPl', currentLang)}:</span>
                <span className={`font-mono font-bold ${corLucro}`}>
                  {item.lucroAbsoluto >= 0 ? '+' : ''}{formatarPreco(item.lucroAbsoluto)} SFL ({item.lucroPercentual.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visão Desktop (>= md): Tabela Completa */}
      <div className="hidden md:block overflow-x-auto bg-cardbg rounded-2xl border border-slate-800 shadow-lg">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold bg-slate-900/50">
              <th className="p-3">{t('thResource', currentLang)}</th>
              <th className="p-3">{t('thQty', currentLang)}</th>
              <th className="p-3">{t('thTotalCost', currentLang)}</th>
              <th className="p-3">{t('thAvgPrice', currentLang)}</th>
              <th className="p-3">{t('thP2pPrice', currentLang)}</th>
              <th className="p-3">{t('thNetValue', currentLang)}</th>
              <th className="p-3 text-right">{t('thEstPl', currentLang)}</th>
              <th className="p-3 text-center">{t('thAction', currentLang)}</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => {
              const corLucro = item.lucroAbsoluto >= 0 ? 'text-emerald-400' : 'text-rose-400';
              const iconUrl = getItemIcon(item.nome);

              return (
                <tr key={item.nome} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                  <td className="p-3 font-bold text-slate-200 flex items-center gap-2">
                    <img
                      src={iconUrl}
                      alt={item.nome}
                      className="w-5 h-5 rounded-sm object-cover align-middle inline-block"
                      onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                    />
                    {item.nome}
                  </td>
                  <td className="p-3 font-mono">{formatarPreco(item.qty)}</td>
                  <td className="p-3 font-semibold font-mono">{formatarPreco(item.custoTotal)} SFL</td>
                  <td className="p-3 text-slate-400 font-mono">{formatarPreco(item.precoMedio)} SFL</td>
                  <td className="p-3 text-amber-400 font-semibold font-mono">
                    {item.precoP2P > 0 ? formatarPreco(item.precoP2P) + ' SFL' : 'N/A'}
                  </td>
                  <td className="p-3 font-bold text-slate-100 font-mono">
                    {formatarPreco(item.valorVendaLiquidoTotal)} SFL
                    <div className="text-[10px] text-slate-400 font-normal">
                      ({formatarPreco(item.precoVendaLiquidoUnitario)} {t('perUnit', currentLang)})
                    </div>
                  </td>
                  <td className={`p-3 text-right font-bold font-mono ${corLucro}`}>
                    {item.lucroAbsoluto >= 0 ? '+' : ''}{formatarPreco(item.lucroAbsoluto)} SFL ({item.lucroPercentual.toFixed(1)}%)
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onOpenSell && onOpenSell(item.nome)}
                      className="bg-rose-950/60 hover:bg-rose-600/30 text-rose-400 text-xs px-2.5 py-1 rounded-lg border border-rose-800/50 transition"
                    >
                      🔴 {t('cardSell', currentLang)}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PortfolioTable;