import React, { useState, useEffect } from 'react';
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

function formatarMoeda(valor, currency = 'usd') {
  if (valor === undefined || valor === null || isNaN(valor)) return '$0.00 USD';
  const num = Number(valor);
  const symbolMap = { usd: '$', brl: 'R$', eur: '€', sgd: 'S$', pol: 'POL' };
  const currLower = (currency || 'usd').toLowerCase();
  const sym = symbolMap[currLower] || '$';
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

const PositionDetailsModal = ({
  position,
  allTransactions = [],
  currentLang = 'en',
  selectedCurrency = 'usd',
  onUpdateCustomAvgPrice,
  onClose
}) => {
  if (!position) return null;

  const {
    nome,
    qty,
    precoMedio,
    precoMedioUsd,
    custoTotalUsd,
    valorVendaLiquidoTotalUsd,
    lucroAbsolutoUsd,
    lucroPercentualUsd,
  } = position;

  const [isEditing, setIsEditing] = useState(false);
  const [editSfl, setEditSfl] = useState('');
  const [editUsd, setEditUsd] = useState('');

  useEffect(() => {
    setEditSfl(precoMedio ? precoMedio.toString() : '');
    setEditUsd(precoMedioUsd ? precoMedioUsd.toString() : '');
  }, [precoMedio, precoMedioUsd]);

  // Filtra histórico de transações específicas deste recurso
  const resourceTxList = allTransactions
    .filter(t => t.recurso && t.recurso.toLowerCase() === nome.toLowerCase())
    .sort((a, b) => new Date(b.timestamp || b.id) - new Date(a.timestamp || a.id));

  const corLucroUsd = lucroAbsolutoUsd >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const iconUrl = getItemIcon(nome);

  const handleSaveCustomAvg = (e) => {
    e.preventDefault();
    const valSfl = editSfl !== '' ? parseFloat(editSfl) : null;
    const valUsd = editUsd !== '' ? parseFloat(editUsd) : null;
    if (onUpdateCustomAvgPrice) {
      onUpdateCustomAvgPrice(nome, valSfl, valUsd);
    }
    setIsEditing(false);
  };

  const handleResetCustomAvg = () => {
    if (onUpdateCustomAvgPrice) {
      onUpdateCustomAvgPrice(nome, null, null);
    }
    setIsEditing(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <img
              src={iconUrl}
              alt={nome}
              className="w-8 h-8 rounded-md object-contain align-middle"
              onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
            />
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {nome}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentLang === 'pt' ? 'Visão Geral & Edição de Preço Médio (DCA)' : 'Overview & Average Price Editing (DCA)'}
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

        {/* Conteúdo com Scroll Interno */}
        <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Card de Resumo do Preço Médio (DCA) + Botão de Edição */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                📊 {currentLang === 'pt' ? 'Preço Médio Ponderado (DCA)' : 'Weighted Average Price (DCA)'}
              </span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[11px] bg-slate-700 hover:bg-slate-600 text-amber-300 font-bold px-2 py-1 rounded-lg border border-slate-600 transition flex items-center gap-1"
              >
                ✏️ {isEditing ? (currentLang === 'pt' ? 'Fechar Edição' : 'Cancel Edit') : (currentLang === 'pt' ? 'Editar Média' : 'Edit Average')}
              </button>
            </div>

            {/* Painel de Edição Manual de Preço Médio */}
            {isEditing ? (
              <form onSubmit={handleSaveCustomAvg} className="bg-slate-900/90 p-3 rounded-xl border border-slate-700/80 space-y-3 animate-fade-in text-xs">
                <div className="text-[11px] text-amber-300 font-semibold mb-1">
                  💡 {currentLang === 'pt' ? 'Ajuste manual de Preço Médio' : 'Manual Average Price Adjustment'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Preço Médio em SFL</label>
                    <input
                      type="number"
                      step="any"
                      value={editSfl}
                      onChange={(e) => setEditSfl(e.target.value)}
                      placeholder="0.0000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Preço Médio em USD ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={editUsd}
                      onChange={(e) => setEditUsd(e.target.value)}
                      placeholder="0.0000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleResetCustomAvg}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    🔄 {currentLang === 'pt' ? 'Restaurar Cálculo Automático' : 'Reset Auto Calculation'}
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs transition"
                  >
                    💾 {currentLang === 'pt' ? 'Salvar Média' : 'Save Average'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{currentLang === 'pt' ? 'Estoque' : 'Stock'}</span>
                  <span className="font-mono font-bold text-slate-100">{formatarPreco(qty)}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{currentLang === 'pt' ? 'Média SFL' : 'Avg SFL'}</span>
                  <span className="font-mono font-bold text-slate-200">{formatarPreco(precoMedio)} SFL</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{currentLang === 'pt' ? 'Média USD' : 'Avg USD'}</span>
                  <span className="font-mono font-bold text-amber-300">${formatarPreco(precoMedioUsd)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card Comparativo de Custo Total vs Valor Atual */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-2">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
              💰 {currentLang === 'pt' ? 'Comparativo Financeiro em Dólar' : 'Financial Comparison in USD'}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  {currentLang === 'pt' ? 'Custo Total USD' : 'Total USD Cost'}
                </span>
                <span className="font-mono text-sm font-bold text-slate-200 block mt-0.5">
                  {formatarMoeda(custoTotalUsd, 'usd')}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  {currentLang === 'pt' ? 'Valor Líquido USD' : 'Net USD Value'}
                </span>
                <span className="font-mono text-sm font-bold text-slate-100 block mt-0.5">
                  {formatarMoeda(valorVendaLiquidoTotalUsd, 'usd')}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">
                {currentLang === 'pt' ? 'Lucro/Prejuízo Real USD:' : 'Real PnL in USD:'}
              </span>
              <span className={`font-mono font-bold text-sm ${corLucroUsd}`}>
                {lucroAbsolutoUsd >= 0 ? '+' : ''}{formatarMoeda(lucroAbsolutoUsd, 'usd')} ({lucroPercentualUsd.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Histórico de Transações do Recurso */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              📜 {currentLang === 'pt' ? 'Histórico de Transações do Recurso' : 'Resource Transactions History'} ({resourceTxList.length})
            </h4>

            {resourceTxList.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4 bg-slate-900/50 rounded-xl border border-slate-800">
                {currentLang === 'pt' ? 'Nenhuma transação registrada para este recurso.' : 'No transactions recorded for this resource.'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {resourceTxList.map((tx) => {
                  const isBuy = tx.tipo === 'buy';
                  const dateFormatted = new Date(tx.timestamp || tx.id).toLocaleDateString(currentLang === 'pt' ? 'pt-BR' : 'en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const cotacaoTx = tx.cotacao_entrada_usd || tx.token_price_usd_at_purchase || 0.05;
                  const totalUsd = tx.total_price_usd || (tx.totalPrice * cotacaoTx);

                  return (
                    <div key={tx.id || Math.random()} className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 text-xs flex justify-between items-center font-mono">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                            {isBuy ? (currentLang === 'pt' ? 'Compra' : 'Buy') : (currentLang === 'pt' ? 'Venda' : 'Sell')}
                          </span>
                          <span className="text-slate-200 font-bold">{formatarPreco(tx.qty)} un</span>
                          <span className="text-slate-400">@ {formatarPreco(tx.unitPrice)} SFL</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {dateFormatted} • $FLOWER: ${cotacaoTx.toFixed(4)}
                        </div>
                      </div>
                      <div className="text-right font-bold">
                        <span className="text-amber-400 block">{formatarPreco(tx.totalPrice)} SFL</span>
                        <span className="text-slate-300 text-[11px] block">${totalUsd.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

export default PositionDetailsModal;
