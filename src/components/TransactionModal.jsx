import React, { useState, useEffect, useRef } from 'react';
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

const TransactionModal = ({
  isOpen,
  onClose,
  type = 'buy', // 'buy' ou 'sell'
  onSubmit,
  effectiveTax = 0.15,
  marketData = {},
  portfolioData = [],
  currentLang = 'en',
  initialResource = ''
}) => {
  const [resourceSearch, setResourceSearch] = useState('');
  const [selectedResource, setSelectedResource] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [maxStock, setMaxStock] = useState(0);

  const dropdownRef = useRef(null);

  // Inicializa o modal ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setUnitPrice('');
      setTotalPrice('');
      setIsDropdownOpen(false);

      if (initialResource) {
        handleSelectResource(initialResource);
      } else {
        setSelectedResource('');
        setResourceSearch('');
        setMaxStock(0);
      }
    }
  }, [isOpen, initialResource]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Seleção de um recurso no dropdown
  const handleSelectResource = (nomeRecurso) => {
    setSelectedResource(nomeRecurso);
    setResourceSearch(nomeRecurso);
    setIsDropdownOpen(false);

    // Preenche preço unitário se disponível na API
    if (marketData[nomeRecurso] !== undefined) {
      const precoApi = marketData[nomeRecurso];
      setUnitPrice(precoApi);
      if (quantity) {
        setTotalPrice((parseFloat(quantity) * precoApi).toFixed(4));
      }
    }

    // Se for venda, verifica o estoque disponível
    if (type === 'sell') {
      const itemEstoque = portfolioData.find(p => p.nome.toLowerCase() === nomeRecurso.toLowerCase());
      if (itemEstoque && itemEstoque.qty > 0) {
        setMaxStock(itemEstoque.qty);
        setQuantity(itemEstoque.qty.toString());
        if (marketData[nomeRecurso]) {
          setTotalPrice((itemEstoque.qty * marketData[nomeRecurso]).toFixed(4));
        }
      } else {
        setMaxStock(0);
      }
    }
  };

  // Preenche a quantidade máxima do estoque
  const handleUseMaxStock = () => {
    if (maxStock > 0) {
      setQuantity(maxStock.toString());
      if (unitPrice) {
        setTotalPrice((maxStock * parseFloat(unitPrice)).toFixed(4));
      }
    }
  };

  // Recálculos de Preço e Quantidade
  const handleQuantityChange = (val) => {
    setQuantity(val);
    const q = parseFloat(val) || 0;
    const u = parseFloat(unitPrice) || 0;
    if (q > 0 && u > 0) {
      setTotalPrice((q * u).toFixed(4));
    }
  };

  const handleUnitPriceChange = (val) => {
    setUnitPrice(val);
    const q = parseFloat(quantity) || 0;
    const u = parseFloat(val) || 0;
    if (q > 0 && u > 0) {
      setTotalPrice((q * u).toFixed(4));
    }
  };

  const handleTotalPriceChange = (val) => {
    setTotalPrice(val);
    const q = parseFloat(quantity) || 0;
    const tVal = parseFloat(val) || 0;
    if (q > 0 && tVal > 0) {
      setUnitPrice((tVal / q).toFixed(4));
    }
  };

  // Filtragem de recursos para o dropdown
  const getFilteredResources = () => {
    const termo = resourceSearch.toLowerCase().trim();
    let listaBase = [];

    if (type === 'sell') {
      listaBase = portfolioData.filter(item => item.qty > 0.0001).map(item => item.nome);
    } else {
      listaBase = Object.keys(marketData).sort();
    }

    return listaBase.filter(r => r.toLowerCase().includes(termo));
  };

  // Tratamento de Envio do Formulário
  const handleSubmit = (e) => {
    e.preventDefault();
    const recursoFinal = selectedResource || resourceSearch.trim();

    if (!recursoFinal) {
      alert(t('alertSelectResource', currentLang));
      return;
    }

    onSubmit({
      tipo: type,
      recurso: recursoFinal,
      qty: parseFloat(quantity) || 0,
      unitPrice: parseFloat(unitPrice) || 0,
      totalPrice: parseFloat(totalPrice) || 0
    });

    onClose();
  };

  // Cálculos de Preview da Taxa no modo Venda
  const qtyNum = parseFloat(quantity) || 0;
  const unitNum = parseFloat(unitPrice) || 0;
  const bruto = qtyNum * unitNum;
  const valorTaxa = bruto * effectiveTax;
  const liquido = bruto - valorTaxa;

  const isBuy = type === 'buy';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-modalbg border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <h3 className={`text-xl font-bold mb-4 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isBuy ? t('modalTitleBuy', currentLang) : t('modalTitleSell', currentLang)}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Seletor de Recurso com Autocomplete */}
          <div className="mb-3 relative" ref={dropdownRef}>
            <label className="block text-xs text-slate-400 mb-1">
              {t('labelResource', currentLang)}
            </label>
            <input
              type="text"
              value={resourceSearch}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setResourceSearch(e.target.value);
                setSelectedResource(e.target.value);
                setIsDropdownOpen(true);
              }}
              placeholder={t('placeholderResource', currentLang)}
              autoComplete="off"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              required
            />

            {/* Dropdown de Resultados */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl max-h-48 overflow-y-auto z-20 shadow-xl">
                {getFilteredResources().length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    {type === 'sell' ? t('noStockSell', currentLang) : t('noItemFound', currentLang)}
                  </div>
                ) : (
                  getFilteredResources().map(rec => (
                    <div
                      key={rec}
                      onClick={() => handleSelectResource(rec)}
                      className="px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition border-b border-slate-800/50 last:border-0"
                    >
                      <span className="font-bold flex items-center gap-1.5">
                        <img
                          src={getItemIcon(rec)}
                          alt={rec}
                          className="w-4 h-4 rounded-sm object-cover"
                          onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                        />
                        {rec}
                      </span>
                      <span className="text-amber-400 font-mono text-[11px]">
                        {marketData[rec] !== undefined ? `${formatarPreco(marketData[rec])} SFL` : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Campo de Quantidade */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs text-slate-400">
                {t('labelQty', currentLang)}
              </label>
              {type === 'sell' && maxStock > 0 && (
                <span
                  onClick={handleUseMaxStock}
                  className="text-[10px] text-amber-400 font-mono hover:underline cursor-pointer"
                >
                  {t('hintStockMax', currentLang, { qty: formatarPreco(maxStock) })}
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Preço Unitário */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs text-slate-400">
                {t('labelUnitPrice', currentLang)}
              </label>
              {selectedResource && marketData[selectedResource] !== undefined && (
                <span className="text-[10px] text-amber-400 font-mono">
                  {t('hintApiPrice', currentLang)}
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={unitPrice}
              onChange={(e) => handleUnitPriceChange(e.target.value)}
              placeholder="0.0000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Preço Total Bruto */}
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">
              {t('labelTotalPrice', currentLang)}
            </label>
            <input
              type="number"
              step="any"
              value={totalPrice}
              onChange={(e) => handleTotalPriceChange(e.target.value)}
              placeholder="0.0000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Painel de Preview de Taxas (Modo Venda) */}
          {type === 'sell' && (
            <div className="mb-5 p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>{t('grossTotal', currentLang)}</span>
                <span className="font-mono text-slate-200">{formatarPreco(bruto)} SFL</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>
                  {t('taxFee', currentLang, { tax: `${(effectiveTax * 100).toFixed(1)}%` })}
                </span>
                <span className="font-mono">-{formatarPreco(valorTaxa)} SFL</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-400 pt-1.5 border-t border-slate-800/80 text-xs md:text-sm">
                <span>{t('netAmount', currentLang)}</span>
                <span className="font-mono">{formatarPreco(liquido)} SFL</span>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition"
            >
              {t('btnCancel', currentLang)}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition ${
                isBuy
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/20'
              }`}
            >
              {t('btnConfirm', currentLang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;