import Icon from "./Icon";
import React, { useState, useEffect } from 'react';
import { t } from '../i18n';
import { handleImageError, FALLBACK_SVG } from '../utils/imageFallback';

function getItemIcon(itemName: string) {
 if (!itemName) return FALLBACK_SVG;
 return `https://sfl.world/img/source/${encodeURIComponent(itemName)}.png`;
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


export interface PositionDetailsModalProps {
 position: { nome: string; qty?: number; precoMedio?: number; cotacaoMediaFlowerUsd?: number; custoTotalUsd?: number; valorVendaLiquidoTotalUsd?: number; lucroAbsolutoUsd?: number; lucroPercentualUsd?: number; currentPrice?: number; cotacaoFlowerUsd?: number; isNft?: boolean; boost_text?: string; totalSflValue?: number; lucroAbsolutoMoeda?: number; lucroPercentualMoeda?: number; image?: string; collection?: string; nft_id?: string | number; } | null;
 allTransactions?: { id: string; type: string; recurso?: string; qty?: number; totalPrice?: number; unitPrice?: number; total_price_usd?: number; timestamp?: string | number; created_at?: string | number; flower_usd_rate?: number; price_sfl?: number; quantity?: number; }[];
 currentLang?: string;
 selectedCurrency?: string;
 onUpdateCustomAvgPrice?: (name: string, avgSfl: number | string | null, flowerUsdRate: number | string | null) => void;
 onUpdateTransactionPrice?: (txId: string, val: string | number) => Promise<boolean> | void;
 onClose: () => void;
}

const PositionDetailsModal: React.FC<PositionDetailsModalProps> = ({
 position,
 allTransactions = [],
 currentLang = 'en',
 onUpdateCustomAvgPrice,
 onUpdateTransactionPrice,
 onClose
}) => {
 if (!position || !position.nome) return null;

 const {
  nome,
  qty,
  precoMedio,
  cotacaoMediaFlowerUsd = 0.05,
  custoTotalUsd,
  valorVendaLiquidoTotalUsd,
  lucroAbsolutoUsd,
  lucroPercentualUsd,
 } = position;

 const [isEditing, setIsEditing] = useState(false);
 const [editSfl, setEditSfl] = useState('');
 const [editFlowerUsd, setEditFlowerUsd] = useState('');

 const [editingTxId, setEditingTxId] = useState<string | null>(null);
 const [editTxFlowerUsd, setEditTxFlowerUsd] = useState('');
 const [isSavingTx, setIsSavingTx] = useState(false);

 useEffect(() => {
  setEditSfl(precoMedio ? precoMedio.toString() : '');
  setEditFlowerUsd(cotacaoMediaFlowerUsd ? cotacaoMediaFlowerUsd.toString() : '');
 }, [precoMedio, cotacaoMediaFlowerUsd]);

 const handleEditTx = (txId: string, currentCotacao: number | string) => {
  setEditingTxId(txId);
  setEditTxFlowerUsd(currentCotacao.toString());
 };

 const handleSaveTx = async (txId: string) => {
  if (!onUpdateTransactionPrice) return;
  setIsSavingTx(true);
  const success = await onUpdateTransactionPrice(txId, editTxFlowerUsd);
  if (success) {
   setEditingTxId(null);
  }
  setIsSavingTx(false);
 };

 const handleCancelTx = () => {
  setEditingTxId(null);
 };

 const resourceTxList = (Array.isArray(allTransactions) ? allTransactions : [])
  .filter((t: { recurso?: string; }) => t && t.recurso && nome && String(t.recurso).toLowerCase() === String(nome).toLowerCase())
  .sort((a: { id?: string; timestamp?: string | number; created_at?: string | number }, b: { id?: string; timestamp?: string | number; created_at?: string | number }) => {
   const timeA = new Date(a.timestamp || a.created_at || a.id || 0).getTime() || 0;
   const timeB = new Date(b.timestamp || b.created_at || b.id || 0).getTime() || 0;
   return timeB - timeA;
  });

 const corLucroUsd = (lucroAbsolutoUsd || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
 const iconUrl = position?.image || (position?.isNft
  ? (position.collection === 'wearables'
    ? `https://sunflower-land.com/play/wearables/images/${position.nft_id}.png`
    : `https://sunflower-land.com/play/erc1155/images/${position.nft_id}.webp`)
  : getItemIcon(nome));

 const handleSaveCustomAvg = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  try {
   const valSfl = editSfl !== '' ? parseFloat(editSfl) : null;
   const valFlowerUsd = editFlowerUsd !== '' ? parseFloat(editFlowerUsd) : null;
   if (onUpdateCustomAvgPrice) {
    onUpdateCustomAvgPrice(nome, valSfl, valFlowerUsd);
   }
  } catch (err) {
   console.warn('[PositionDetailsModal] Erro ao salvar preço médio customizado:', err);
  } finally {
   setIsEditing(false);
  }
 };

 const handleResetCustomAvg = () => {
  try {
   if (onUpdateCustomAvgPrice) {
    onUpdateCustomAvgPrice(nome, null, null);
   }
  } catch (err) {
   console.warn('[PositionDetailsModal] Erro ao restaurar preço médio:', err);
  } finally {
   setIsEditing(false);
  }
 };

  const previewUnitUsd = (parseFloat(editSfl || '0') * parseFloat(editFlowerUsd || '0')).toFixed(4);

 return (
  <div 
   className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 z-50 animate-fadeIn"
   onClick={onClose}
  >
   <div 
    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-lg w-full shadow-2xl space-y-3 max-h-[85vh] flex flex-col relative"
    onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
   >
    
    {/* Cabeçalho Compacto do Modal */}
    <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
     <div className="flex items-center gap-2">
      <img
       src={iconUrl}
       alt={nome}
       className="w-7 h-7 rounded-md object-contain align-middle"
       onError={handleImageError}
      />
      <div>
       <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5 leading-tight">
        {nome}
       </h3>
       <p className="text-[10px] text-slate-400">
        {currentLang === 'pt' ? 'Visão Geral & Preço Médio (DCA)' : 'Overview & Average Price (DCA)'}
       </p>
      </div>
     </div>
     <button 
      onClick={onClose}
      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-base"
     >
      ✕
     </button>
    </div>

    {/* Conteúdo com Scroll Interno Ajustado */}
    <div className="overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-700 flex-1">
     
     {/* Card de Resumo do Preço Médio (DCA) + Botão de Edição */}
     <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700 space-y-2">
      <div className="flex justify-between items-center">
       <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
         {currentLang === 'pt' ? 'Preço Médio Ponderado (DCA)' : 'Weighted Average Price (DCA)'}
       </span>
       <button
        onClick={() => setIsEditing(!isEditing)}
        className="text-[10px] bg-slate-700 hover:bg-slate-600 text-amber-300 font-bold px-2 py-0.5 rounded-lg border border-slate-600 transition flex items-center gap-1"
       >
         {isEditing ? (currentLang === 'pt' ? 'Cancelar' : 'Cancel') : (currentLang === 'pt' ? 'Editar' : 'Edit')}
       </button>
      </div>

      {/* Painel de Edição Manual */}
      {isEditing ? (
       <form onSubmit={handleSaveCustomAvg} className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-2 animate-fade-in text-xs">
        <div className="text-[10px] text-amber-300 font-semibold mb-0.5">
          {currentLang === 'pt' ? 'Definir Preço Médio e Cotação' : 'Set Avg Price & Rate'}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
         <div>
          <label className="block text-[9px] text-slate-400 mb-0.5">
           {currentLang === 'pt' ? 'Preço Médio FLOWER' : 'Avg Price FLOWER'}
          </label>
          <input
           type="number"
           step="any"
           value={editSfl}
           onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSfl(e.target.value)}
           placeholder="0.0239"
           className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
          />
         </div>

         <div>
          <label className="block text-[9px] text-slate-400 mb-0.5">
           {currentLang === 'pt' ? 'Cotação $FLOWER ($)' : 'Avg $FLOWER USD ($)'}
          </label>
          <input
           type="number"
           step="any"
           value={editFlowerUsd}
           onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFlowerUsd(e.target.value)}
           placeholder="0.0670"
           className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 focus:outline-none focus:border-amber-400 font-mono font-bold"
          />
         </div>
        </div>

        <div className="text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded-lg font-mono flex justify-between">
         <span>{currentLang === 'pt' ? 'Custo USD / un:' : 'Avg USD / unit:'}</span>
         <span className="font-bold text-amber-300">${previewUnitUsd}</span>
        </div>

        <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
         <button
          type="button"
          onClick={handleResetCustomAvg}
          className="text-[9px] text-rose-400 hover:underline"
         >
           {currentLang === 'pt' ? 'Restaurar Auto' : 'Reset Auto'}
         </button>
         <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-0.5 rounded-lg text-xs transition"
         >
           {currentLang === 'pt' ? 'Salvar' : 'Save'}
         </button>
        </div>
       </form>
      ) : (
       <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
        <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
         <span className="text-[9px] text-slate-400 block">{currentLang === 'pt' ? 'Estoque' : 'Stock'}</span>
         <span className="font-mono font-bold text-slate-100 text-xs">{formatarPreco(qty)}</span>
        </div>
        <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
         <span className="text-[9px] text-slate-400 block">{currentLang === 'pt' ? 'Média FLOWER' : 'Avg FLOWER'}</span>
         <span className="font-mono font-bold text-slate-200 text-xs">{formatarPreco(precoMedio)} FLOWER</span>
        </div>
        <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
         <span className="text-[9px] text-amber-300 font-semibold block">
          {currentLang === 'pt' ? 'Cotação $FLOWER' : 'Avg $FLOWER'}
         </span>
         <span className="font-mono font-bold text-amber-300 text-[10px] block mt-0.5">
          ${cotacaoMediaFlowerUsd.toFixed(4)} USD
         </span>
        </div>
       </div>
      )}
     </div>

     {/* Card Comparativo de Custo Total vs Valor Atual */}
     <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700 space-y-1.5">
      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
        {currentLang === 'pt' ? 'Comparativo Financeiro em Dólar' : 'Financial Comparison in USD'}
      </span>
      <div className="grid grid-cols-2 gap-2 text-xs">
       <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
        <span className="text-[9px] text-slate-400 block uppercase font-semibold">
         {currentLang === 'pt' ? 'Custo Total USD' : 'Total USD Cost'}
        </span>
        <span className="font-mono text-xs font-bold text-slate-200 block mt-0.5">
         {formatarMoeda(custoTotalUsd, 'usd')}
        </span>
       </div>
       <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
        <span className="text-[9px] text-slate-400 block uppercase font-semibold">
         {currentLang === 'pt' ? 'Valor Líquido USD' : 'Net USD Value'}
        </span>
        <span className="font-mono text-xs font-bold text-slate-100 block mt-0.5">
         {formatarMoeda(valorVendaLiquidoTotalUsd, 'usd')}
        </span>
       </div>
      </div>

      <div className="pt-1.5 border-t border-slate-700/60 flex justify-between items-center text-xs">
       <span className="text-slate-400 font-semibold text-[11px]">
        {currentLang === 'pt' ? 'Lucro/Prejuízo Real:' : 'Real PnL:'}
       </span>
       <span className={`font-mono font-bold text-xs ${corLucroUsd}`}>
        {(lucroAbsolutoUsd || 0) >= 0 ? '+' : ''}{formatarMoeda(lucroAbsolutoUsd, 'usd')} ({(lucroPercentualUsd || 0).toFixed(1)}%)
       </span>
      </div>
     </div>

     {/* Histórico de Transações Compacto */}
     <div>
      <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {currentLang === 'pt' ? 'Histórico de Transações' : 'Transactions History'} ({resourceTxList.length})
      </h4>

      {resourceTxList.length === 0 ? (
       <div className="text-[11px] text-slate-500 text-center py-3 bg-slate-900/50 rounded-xl border border-slate-800">
        {currentLang === 'pt' ? 'Nenhuma transação registrada.' : 'No transactions recorded.'}
       </div>
      ) : (
       <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {resourceTxList.map((tx: { id: string; recurso?: string; tipo?: string; cotacao_entrada_usd?: number; token_price_usd_at_purchase?: number; timestamp?: string | number; created_at?: string | number; type?: string; qty?: number; totalPrice?: number; unitPrice?: number; total_price_usd?: number; }, idx: number) => {
         const isBuy = tx.tipo === 'buy';
         const dateFormatted = new Date(tx.timestamp || tx.created_at || tx.id).toLocaleDateString(currentLang === 'pt' ? 'pt-BR' : 'en-US', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
         });
         const cotacaoTx = tx.cotacao_entrada_usd || tx.token_price_usd_at_purchase || cotacaoMediaFlowerUsd || 0.05;
         const totalUsd = tx.total_price_usd || ((tx.totalPrice || 0) * cotacaoTx);
         const stableKey = tx.id || `${tx.recurso || 'tx'}-${tx.timestamp || 'ts'}-${idx}`;

         return (
          <div key={stableKey} className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/80 text-[11px] font-mono">
           {editingTxId === tx.id ? (
            <div className="flex flex-col gap-1.5">
             <div className="flex justify-between items-center text-slate-300">
              <span>{dateFormatted} - {isBuy ? 'Buy' : 'Sell'} {formatarPreco(tx.qty)} un</span>
              <span className="text-amber-400">{formatarPreco(tx.totalPrice)} FLOWER</span>
             </div>
             <div className="flex items-center gap-2">
              <label className="text-slate-400 text-[10px] w-20">Price (USD):</label>
              <input
               type="number"
               step="0.0001"
               value={editTxFlowerUsd}
               onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTxFlowerUsd(e.target.value)}
               className="w-full bg-slate-950 text-white rounded p-1 border border-slate-700 text-xs text-center"
               disabled={isSavingTx}
              />
             </div>
             <div className="flex gap-2 mt-1">
              <button
               onClick={() => handleSaveTx(tx.id)}
               disabled={isSavingTx}
               className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1 rounded text-xs font-bold transition disabled:opacity-50"
              >
               {isSavingTx ? '...' : (currentLang === 'pt' ? 'Salvar' : 'Save')}
              </button>
              <button
               onClick={handleCancelTx}
               disabled={isSavingTx}
               className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-1 rounded text-xs transition"
              >
               {currentLang === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
             </div>
            </div>
           ) : (
            <div className="flex justify-between items-center">
             <div>
              <div className="flex items-center gap-1.5">
               <span className={`flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                <Icon name={isBuy ? 'buy' : 'sell'} className="w-2.5 h-2.5" />
                {isBuy ? (currentLang === 'pt' ? 'Compra' : 'Buy') : (currentLang === 'pt' ? 'Venda' : 'Sell')}
               </span>
               <span className="text-slate-200 font-bold">{formatarPreco(tx.qty)} un</span>
               <span className="text-slate-400">@ {formatarPreco(tx.unitPrice)} FLOWER</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
               <span>{dateFormatted} • $FLOWER: ${cotacaoTx.toFixed(4)}</span>
               {onUpdateTransactionPrice && tx.id && (
                <button 
                 onClick={() => handleEditTx(tx.id, cotacaoTx)}
                 className="text-amber-500 hover:text-amber-400 underline decoration-dotted opacity-80 hover:opacity-100 transition px-1"
                 title={currentLang === 'pt' ? 'Editar preço de compra' : 'Edit purchase price'}
                >
                 
                </button>
               )}
              </div>
             </div>
             <div className="text-right font-bold">
              <span className="text-amber-400 block">{formatarPreco(tx.totalPrice)} FLOWER</span>
              <span className="text-slate-300 text-[10px] block">${totalUsd.toFixed(2)}</span>
             </div>
            </div>
           )}
          </div>
         );
        })}
       </div>
      )}
     </div>

    </div>

    {/* Botão de Fechar Compacto */}
    <button
     onClick={onClose}
     className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 rounded-xl text-xs transition border border-slate-700"
    >
     {t('btnCancel', currentLang)}
    </button>

   </div>
  </div>
 );
};

export default PositionDetailsModal;
