import React, { useState } from 'react';
import { t } from '../i18n';
import PositionDetailsModal from './PositionDetailsModal';
import { handleImageError, getItemImageUrl } from '../utils/imageFallback';

function getItemIcon(itemName: string) {
 return getItemImageUrl(itemName);
}

function formatarPreco(valor: number | string | undefined | null) {
 if (valor === undefined || valor === null || isNaN(Number(valor))) return '0';
 const num = Number(valor);
 if (num === 0) return '0';
 if (num >= 10) return num.toFixed(2);
 if (num >= 1) return num.toFixed(3);
 return parseFloat(num.toPrecision(3)).toString();
}

function formatarMoeda(valor: number | string | undefined | null, currency: string = 'usd') {
 if (valor === undefined || valor === null || isNaN(Number(valor))) return '$0.00 USD';
 const num = Number(valor);
 const symbolMap = { usd: '$', brl: 'R$', eur: '€', sgd: 'S$', pol: 'POL' };
 const currLower = (currency || 'usd').toLowerCase();
  const sym = symbolMap[currLower as keyof typeof symbolMap] || '$';
 const currCode = currency.toUpperCase();
 const sinal = num < 0 ? '-' : '';
 const absNum = Math.abs(num);
 
 let formattedStr = '';
 if (absNum === 0) {
  formattedStr = '0.00';
 } else if (absNum >= 100) {
  formattedStr = absNum.toFixed(2);
 } else if (absNum >= 1) {
  formattedStr = absNum.toFixed(2);
 } else {
  formattedStr = absNum.toFixed(3);
 }

 return `${sinal}${sym}${formattedStr} ${currCode}`;
}


export interface PortfolioPosition {
 nome: string;
 qty?: number;
 saldo?: number;
 tipo_ativo?: string;
 isNft?: boolean;
 transactions?: { id: string; type: string; qty: number; totalPrice: number; unitPrice: number; }[];
 customAvgPrice?: number;
 lucroAbsolutoUsd?: number;
 lucroPercentualUsd?: number;
 precoP2P?: number;
 valorVendaLiquidoTotal?: number;
 precoVendaLiquidoUnitario?: number;
 lucroAbsoluto?: number;
 lucroPercentual?: number;
 precoMedioUsd?: number;
 custoTotal?: number;
 boost_text?: string;
 image?: string;
 collection?: string;
 nft_id?: string | number;
 custoTotalUsd?: number;
 valorVendaLiquidoTotalUsd?: number;
 precoMedio?: number;
 cotacaoMediaFlowerUsd?: number;
 totalSflValue?: number;
 currentPrice?: number;
 lucroAbsolutoMoeda?: number;
 lucroPercentualMoeda?: number;
 [key: string]: unknown;
}

export interface PortfolioTableProps {
 data: PortfolioPosition[];
 marketData?: Record<string, number>;
 flowerPrice?: number;
 onTradeClick?: (name: string) => void;
 onAddAsset?: () => void;
 onSetTargetPrice?: (name: string, val: string | number) => void;
 onSetAlertLevel?: (name: string, val: string) => void;
 selectedCurrency?: string;
 onUpdateCustomAvgPrice?: (name: string, avgSfl: number | string | null, flowerUsdRate: number | string | null) => void;
 onUpdateTransactionPrice?: (txId: string, val: string | number) => Promise<boolean> | void;
 onOpenSell?: (name?: string, meta?: Record<string, unknown> | null) => void;
 transactions?: { id: string; type: string; qty: number; totalPrice: number; unitPrice: number; }[];
 currentLang?: string;
}

const PortfolioTable: React.FC<PortfolioTableProps> = ({
 data = [],
 transactions = [],
 currentLang = 'en',
 selectedCurrency = 'usd',
 onUpdateCustomAvgPrice,
 onUpdateTransactionPrice,
 onOpenSell
}) => {
 const [selectedPosition, setSelectedPosition] = useState<PortfolioPosition | null>(null);

 // Busca item atualizado dos dados
 const activePositionItem = selectedPosition 
    ? (data.find((p: PortfolioPosition) => p.nome.toLowerCase() === selectedPosition.nome.toLowerCase()) || selectedPosition)
  : null;

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
    {data.map((item: PortfolioPosition) => {
     const corLucroToken = (item.lucroAbsoluto || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
     const corLucroMoeda = (item.lucroAbsolutoMoeda || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
     const iconUrl = item.image || (item.isNft
      ? (item.collection === 'wearables'
        ? `https://sunflower-land.com/play/wearables/images/${item.nft_id}.png`
        : `https://sunflower-land.com/play/erc1155/images/${item.nft_id}.webp`)
      : getItemIcon(item.nome));

     return (
      <div 
       key={item.nome} 
       onClick={() => setSelectedPosition(item)}
       className="bg-cardbg hover:bg-slate-800/40 rounded-xl p-3.5 border border-slate-800 hover:border-amber-400/60 shadow-md flex flex-col gap-2.5 cursor-pointer transition"
       title={currentLang === 'pt' ? 'Clique para ver detalhes e histórico DCA' : 'Click to view position details and DCA history'}
      >
       <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
         <img
          src={iconUrl}
          alt={item.nome}
          className="w-6 h-6 rounded-sm object-cover align-middle inline-block"
          onError={handleImageError}
         />
         <div>
          <div className="flex items-center gap-1.5 flex-wrap">
           <span className="text-sm font-bold text-slate-100">{item.nome}</span>
           {item.isNft && (
            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1 py-0.2 rounded uppercase">
             NFT
            </span>
           )}
           {item.boost_text && (
            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1 py-0.2 rounded">
             {item.boost_text}
            </span>
           )}
          </div>
          <span className="text-xs text-slate-400 font-mono block">x{formatarPreco(item.qty)}</span>
         </div>
        </div>
        <button
         onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          if (onOpenSell) onOpenSell(item.nome, item);
         }}
         className="bg-rose-950/80 hover:bg-rose-600/30 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-800/60 transition"
        >
          {t('cardSell', currentLang)}
        </button>
       </div>

       <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
         <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('thTotalCost', currentLang)}</span>
         <span className="font-mono text-slate-200">{formatarPreco(item.custoTotal)} FLOWER</span>
         {(item.custoTotalUsd || 0) > 0 && (
          <span className="font-mono text-[10px] text-amber-300 block">${(item.custoTotalUsd || 0).toFixed(2)}</span>
         )}
        </div>
        <div>
         <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('thAvgPrice', currentLang)}</span>
         <span className="font-mono text-slate-300">{formatarPreco(item.precoMedio)} FLOWER</span>
         {(item.precoMedioUsd || 0) > 0 && (
          <span className="font-mono text-[10px] text-slate-400 block">${formatarPreco(item.precoMedioUsd)}/un</span>
         )}
        </div>
        <div>
         <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('thNetValue', currentLang)}</span>
         <span className="font-mono text-slate-100 font-semibold">{formatarPreco(item.valorVendaLiquidoTotal)} FLOWER</span>
        </div>
        <div>
         <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('thP2pPrice', currentLang)}</span>
         <span className="font-mono text-amber-400 font-semibold">{(item.precoP2P || 0) > 0 ? formatarPreco(item.precoP2P) + ' FLOWER' : 'N/A'}</span>
        </div>
       </div>

       <div className="pt-2 border-t border-slate-800 flex flex-wrap justify-between items-center text-xs gap-y-1">
        <span className="text-slate-400 font-semibold">{t('thEstPl', currentLang)}:</span>
        <div className="font-mono font-bold text-right flex flex-wrap justify-end items-center gap-1.5 text-xs">
         <span className={corLucroToken}>
          {(item.lucroAbsoluto || 0) >= 0 ? '+' : ''}{formatarPreco(item.lucroAbsoluto)} FLOWER ({(item.lucroPercentual || 0).toFixed(1)}%)
         </span>
         <span className="text-slate-600">|</span>
         <span className={corLucroMoeda}>
          {(item.lucroAbsolutoMoeda || 0) >= 0 ? '+' : ''}{formatarMoeda(item.lucroAbsolutoMoeda, selectedCurrency)} ({(item.lucroPercentualMoeda || 0).toFixed(1)}%)
         </span>
        </div>
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
      {data.map((item: PortfolioPosition) => {
       const corLucroToken = (item.lucroAbsoluto || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
       const corLucroMoeda = (item.lucroAbsolutoMoeda || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
       const iconUrl = item.image || (item.isNft
        ? (item.collection === 'wearables'
          ? `https://sunflower-land.com/play/wearables/images/${item.nft_id}.png`
          : `https://sunflower-land.com/play/erc1155/images/${item.nft_id}.webp`)
        : getItemIcon(item.nome));

       return (
        <tr 
         key={item.nome} 
         onClick={() => setSelectedPosition(item)}
         className="border-b border-slate-800 hover:bg-slate-800/50 transition cursor-pointer"
         title={currentLang === 'pt' ? 'Clique para ver detalhes da posição e histórico DCA' : 'Click to view position details and DCA history'}
        >
         <td className="p-3 font-bold text-slate-200 flex items-center gap-2">
          <img
           src={iconUrl}
           alt={item.nome}
           className="w-5 h-5 rounded-sm object-cover align-middle inline-block"
           onError={handleImageError}
          />
          <div className="flex items-center gap-1.5 flex-wrap">
           <span>{item.nome}</span>
           {item.isNft && (
            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1 py-0.2 rounded uppercase">
             NFT
            </span>
           )}
           {item.boost_text && (
            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1 py-0.2 rounded" title={item.boost_text}>
             {item.boost_text}
            </span>
           )}
          </div>
         </td>
         <td className="p-3 font-mono">{formatarPreco(item.qty)}</td>
         <td className="p-3 font-semibold font-mono">
          {formatarPreco(item.custoTotal)} SFL
          {(item.custoTotalUsd || 0) > 0 && (
           <div className="text-[10px] text-amber-300 font-normal">${(item.custoTotalUsd || 0).toFixed(2)}</div>
          )}
         </td>
         <td className="p-3 text-slate-400 font-mono">
          {formatarPreco(item.precoMedio)} SFL
          {(item.precoMedioUsd || 0) > 0 && (
           <div className="text-[10px] text-slate-400 font-normal">${formatarPreco(item.precoMedioUsd)}/un</div>
          )}
         </td>
         <td className="p-3 text-amber-400 font-semibold font-mono">
          {(item.precoP2P || 0) > 0 ? formatarPreco(item.precoP2P) + ' FLOWER' : 'N/A'}
         </td>
         <td className="p-3 font-bold text-slate-100 font-mono">
          {formatarPreco(item.valorVendaLiquidoTotal)} SFL
          <div className="text-[10px] text-slate-400 font-normal">
           ({formatarPreco(item.precoVendaLiquidoUnitario)} {t('perUnit', currentLang)})
          </div>
         </td>
         <td className="p-3 text-right font-mono">
          <div className="flex flex-col items-end gap-0.5">
           <span className={`font-bold ${corLucroToken}`}>
            {(item.lucroAbsoluto || 0) >= 0 ? '+' : ''}{formatarPreco(item.lucroAbsoluto)} FLOWER ({(item.lucroPercentual || 0).toFixed(1)}%)
           </span>
           <span className={`text-[11px] font-semibold ${corLucroMoeda}`}>
            {(item.lucroAbsolutoMoeda || 0) >= 0 ? '+' : ''}{formatarMoeda(item.lucroAbsolutoMoeda, selectedCurrency)} ({(item.lucroPercentualMoeda || 0).toFixed(1)}%)
           </span>
          </div>
         </td>
         <td className="p-3 text-center">
          <button
           onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (onOpenSell) onOpenSell(item.nome, item);
           }}
           className="bg-rose-950/60 hover:bg-rose-600/30 text-rose-400 text-xs px-2.5 py-1 rounded-lg border border-rose-800/50 transition"
          >
            {t('cardSell', currentLang)}
          </button>
         </td>
        </tr>
       );
      })}
     </tbody>
    </table>
   </div>

   {/* Modal de Detalhes da Posição */}
   {activePositionItem && (
    <PositionDetailsModal
     position={activePositionItem}
     allTransactions={transactions}
     currentLang={currentLang}
     selectedCurrency={selectedCurrency}
     onUpdateCustomAvgPrice={onUpdateCustomAvgPrice}
     onUpdateTransactionPrice={onUpdateTransactionPrice}
     onClose={() => setSelectedPosition(null)}
    />
   )}
  </section>
 );
};

export default PortfolioTable;