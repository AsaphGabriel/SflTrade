import React, { useState } from 'react';
import { t } from '../i18n';

const Header = ({
  flowerPrice,
  effectiveTax,
  selectedIsland,
  onIslandChange,
  isVip,
  onVipToggle,
  isShrine,
  onShrineToggle,
  currentLang,
  onLangChange,
  selectedCurrency,
  onCurrencyChange,
  onRefresh,
  onOpenBuy,
  onOpenSell,
  onSearchFarm,
  updatedTimeText = "• Updated just now",
  savedFarmId
}) => {
  const [farmSearch, setFarmSearch] = useState('');
  const [convQty, setConvQty] = useState('');

  // Dispara a busca quando o usuário aperta Enter ou clica na lupa
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchFarm && farmSearch.trim() !== '') {
      onSearchFarm(farmSearch.trim());
    }
  };

  // Calcula o valor do conversor rápido
  const converterResultado = (parseFloat(convQty || 0) * flowerPrice).toFixed(4);
  
  // Símbolo da moeda selecionada
  const symbolMap = { usd: '$', brl: 'R$', eur: '€', sgd: 'S$', pol: 'POL' };
  const sym = symbolMap[selectedCurrency] || '$';

  return (
    <>
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <img 
                src="https://sfl.world/img/source/Sunflower.png" 
                alt="Sunflower" 
                className="w-6 h-6 object-contain align-middle"
              />
              SFL Tracker
            </h1>
            
            {/* Barra de Pesquisa de Farm ID */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1 bg-cardbg px-2 py-1 rounded-xl border border-slate-700">
              <input 
                type="text" 
                value={farmSearch}
                onChange={(e) => setFarmSearch(e.target.value)}
                placeholder={savedFarmId || "Farm ID / Nick"} // <-- A MÁGICA ACONTECE AQUI
                className="w-24 bg-transparent text-xs text-white focus:outline-none placeholder-slate-500"
              />
              <button type="submit" className="text-amber-400 hover:text-amber-300" aria-label="Buscar">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400">{t('subTitle', currentLang)}</p>
            <span className="text-[11px] text-slate-500 font-mono italic">
              {updatedTimeText}
            </span>
          </div>
        </div>

        {/* Controles do Header */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          
          {/* Seletor de Idioma */}
          <div className="flex items-center gap-1.5 bg-cardbg px-2.5 py-2 rounded-xl border border-slate-700">
            <span className="text-xs">🌐</span>
            <select 
              value={currentLang} 
              onChange={(e) => onLangChange(e.target.value)} 
              className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-900 text-white">EN</option>
              <option value="pt" className="bg-slate-900 text-white">PT</option>
            </select>
          </div>

          {/* Seletor de Ilha */}
          <div className="flex items-center gap-1.5 bg-cardbg px-2.5 py-2 rounded-xl border border-slate-700">
            <span className="text-xs">🏝️</span>
            <select 
              value={selectedIsland} 
              onChange={(e) => onIslandChange(e.target.value)} 
              className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="basic" className="bg-slate-900 text-slate-400">{t('islandBasic', currentLang)}</option>
              <option value="petal" className="bg-slate-900 text-white">{t('islandPetal', currentLang)}</option>
              <option value="desert" className="bg-slate-900 text-white">{t('islandDesert', currentLang)}</option>
              <option value="volcano" className="bg-slate-900 text-white">{t('islandVolcano', currentLang)}</option>
              <option value="ascension" className="bg-slate-900 text-slate-500" disabled>{t('islandAscension', currentLang)}</option>
            </select>
          </div>

          {/* Checkboxes de Taxa */}
          <label className="flex items-center gap-1.5 bg-cardbg px-2.5 py-2 rounded-xl border border-slate-700 cursor-pointer select-none hover:border-amber-500/50 transition">
            <input 
              type="checkbox" 
              checked={isVip} 
              onChange={(e) => onVipToggle(e.target.checked)} 
              className="accent-amber-400 rounded cursor-pointer"
            />
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">👑 <span>{t('labelVip', currentLang)}</span></span>
          </label>

          <label className="flex items-center gap-1.5 bg-cardbg px-2.5 py-2 rounded-xl border border-slate-700 cursor-pointer select-none hover:border-emerald-500/50 transition">
            <input 
              type="checkbox" 
              checked={isShrine} 
              onChange={(e) => onShrineToggle(e.target.checked)} 
              className="accent-emerald-400 rounded cursor-pointer"
            />
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">⛩️ <span>{t('labelShrine', currentLang)}</span></span>
          </label>

          {/* Botões de Ação */}
          <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
            <button onClick={() => onOpenBuy('')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition flex items-center gap-1 shadow-lg shadow-emerald-900/20">
              {t('btnBuy', currentLang)}
            </button>
            <button onClick={() => onOpenSell('')} className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition flex items-center gap-1 shadow-lg shadow-rose-900/20">
              {t('btnSell', currentLang)}
            </button>
            <button onClick={onRefresh} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-3 rounded-xl text-xs transition">
              {t('btnRefresh', currentLang)}
            </button>
          </div>
        </div>
      </header>

      {/* Cotação SFL & Conversor Rápido */}
      <div className="bg-cardbg rounded-2xl p-4 mb-6 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">{t('sflQuoteTitle', currentLang)}</div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-1">
              {sym} {flowerPrice.toFixed(4)} {selectedCurrency.toUpperCase()}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* O SELETOR DE MOEDA VOLTOU! */}
            <select 
              value={selectedCurrency} 
              onChange={(e) => onCurrencyChange(e.target.value)} 
              className="bg-slate-900 border border-slate-700 text-white rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="usd">USD ($)</option>
              <option value="brl">BRL (R$)</option>
              <option value="eur">EUR (€)</option>
              <option value="sgd">SGD (S$)</option>
              <option value="pol">POL</option>
            </select>
            
            <div className="text-right text-xs text-slate-400 ml-2">
              <span>{t('activeTaxLabel', currentLang)}</span> 
              <span className={`font-bold text-sm block md:inline font-mono ${selectedIsland === 'basic' ? 'text-slate-400' : 'text-amber-400'}`}>
                {selectedIsland === 'basic' ? ' N/A' : ` ${(effectiveTax * 100).toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>
        
        {/* Quick Converter */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">$FLOWER Qty:</label>
          <input 
            type="number" 
            value={convQty}
            onChange={(e) => setConvQty(e.target.value)}
            placeholder="0" 
            className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
          />
          <span className="text-xs text-slate-400">→</span>
          <span className="text-xs font-mono text-amber-400">{sym} {converterResultado}</span>
        </div>
      </div>
    </>
  );
};

export default Header;