import React, { useState, useMemo } from 'react';
import { t } from '../i18n';
import { getBumpkinXPDetails } from '../utils/bumpkinLevel';

// Categorizador de Recursos do Inventário
export function getItemCategory(name) {
  if (!name) return 'other';
  const n = name.toLowerCase();
  
  // Crops & Fruits
  if ([
    'sunflower', 'potato', 'pumpkin', 'carrot', 'cabbage', 'beetroot', 
    'cauliflower', 'parsnip', 'radish', 'wheat', 'kale', 'apple', 
    'blueberry', 'orange', 'eggplant', 'corn', 'banana', 'soybean', 
    'grape', 'rice', 'olive', 'tomato', 'lemon', 'barley', 'rhubarb', 
    'zucchini', 'yam', 'broccoli', 'pepper', 'onion', 'turnip', 'artichoke',
    'duskberry', 'lunara', 'celestine'
  ].includes(n)) {
    return 'crops';
  }

  // Resources & Ores
  if ([
    'wood', 'stone', 'iron', 'gold', 'crimstone', 'obsidian', 'sunstone', 
    'oil', 'wild grass', 'salt'
  ].includes(n) || n.includes('wood') || n.includes('stone') || n.includes('ore')) {
    return 'resources';
  }

  // Animals
  if ([
    'egg', 'honey', 'leather', 'wool', 'merino wool', 'feather', 'milk'
  ].includes(n) || n.includes('milk') || n.includes('wool')) {
    return 'animals';
  }

  // Emblems & Faction Items
  if (n.includes('emblem') || [
    'ruffroot', 'chewed bone', 'heart leaf', 'moonfur', 'ribbon', 
    'dewberry', 'frost pebble', 'capsule bait', 'umbrella bait', 
    'crimson baitfish', 'saltwort'
  ].includes(n)) {
    return 'emblems';
  }

  // Seeds, Tools & Misc
  return 'other';
}

// Ícones / Emojis por Item
export function getItemEmoji(name) {
  if (!name) return '📦';
  const n = name.toLowerCase();
  if (n.includes('sunflower')) return '🌻';
  if (n.includes('potato')) return '🥔';
  if (n.includes('pumpkin')) return '🎃';
  if (n.includes('carrot')) return '🥕';
  if (n.includes('cabbage')) return '🥬';
  if (n.includes('beetroot')) return '🧅';
  if (n.includes('cauliflower')) return '🥦';
  if (n.includes('parsnip')) return '🥕';
  if (n.includes('wheat')) return '🌾';
  if (n.includes('kale')) return '🥬';
  if (n.includes('apple')) return '🍎';
  if (n.includes('blueberry')) return '🫐';
  if (n.includes('orange')) return '🍊';
  if (n.includes('eggplant')) return '🍆';
  if (n.includes('corn')) return '🌽';
  if (n.includes('banana')) return '🍌';
  if (n.includes('grape')) return '🍇';
  if (n.includes('rice')) return '🌾';
  if (n.includes('tomato')) return '🍅';
  if (n.includes('lemon')) return '🍋';
  if (n.includes('wood')) return '🪵';
  if (n.includes('stone')) return '🪨';
  if (n.includes('iron')) return '⚙️';
  if (n.includes('gold')) return '🪙';
  if (n.includes('egg')) return '🥚';
  if (n.includes('honey')) return '🍯';
  if (n.includes('leather')) return '🛡️';
  if (n.includes('wool')) return '🧶';
  if (n.includes('milk')) return '🥛';
  if (n.includes('feather')) return '🪶';
  if (n.includes('emblem')) return '🛡️';
  if (n.includes('seed')) return '🌱';
  if (n.includes('axe')) return '🪓';
  if (n.includes('pickaxe')) return '⛏️';
  if (n.includes('pass')) return '👑';
  if (n.includes('gem')) return '💎';
  return '📦';
}

const StatCard = ({ label, value, subValue, icon, colorClass = "text-amber-400" }) => (
  <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-700/60 shadow-md flex flex-col justify-between hover:border-slate-600 transition">
    <div className="flex items-center justify-between gap-1">
      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      {icon && <span className="text-base">{icon}</span>}
    </div>
    <div className="mt-2">
      <span className={`text-base font-extrabold ${colorClass}`}>{value}</span>
      {subValue && <span className="block text-[11px] text-slate-400 font-medium mt-0.5">{subValue}</span>}
    </div>
  </div>
);

const FarmDashboard = ({
  farmData,
  marketData = {},
  flowerPrice = 0.087,
  selectedCurrency = 'usd',
  currentLang = 'pt',
  farmId = '',
  apiKey = '',
  setFarmId = () => {},
  setApiKey = () => {},
  onSaveProfile = () => {},
  profileMsg = { text: '', type: '' },
  searchFarm = () => {},
  user = null,
  syncCloud = () => {},
  isSyncing = false,
  onOpenAuthModal = () => {}
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('value');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currencySymbol = useMemo(() => {
    switch (selectedCurrency.toLowerCase()) {
      case 'brl': return 'R$';
      case 'eur': return '€';
      case 'sgd': return 'S$';
      case 'pol': return 'POL ';
      default: return '$';
    }
  }, [selectedCurrency]);

  const formatNum = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Number(num).toLocaleString(currentLang === 'pt' ? 'pt-BR' : 'en-US', {
      maximumFractionDigits: decimals
    });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return `${currencySymbol}0.00`;
    return `${currencySymbol}${Number(amount).toLocaleString(currentLang === 'pt' ? 'pt-BR' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const handleRefresh = async () => {
    if (!farmId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await searchFarm(farmId, apiKey, true);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // Processamento do Inventário e Valoração Financeira
  const inventoryAnalysis = useMemo(() => {
    const rawInventory = farmData?.land?.inventory || {};
    const items = [];
    let totalStockSfl = 0;
    let pricedItemsCount = 0;

    Object.entries(rawInventory).forEach(([itemName, rawQty]) => {
      const qty = Number(rawQty);
      if (qty <= 0) return;

      // Busca preço unitário no mercado (case-insensitive)
      let unitPriceSfl = marketData[itemName] || 0;
      if (!unitPriceSfl) {
        const matchedKey = Object.keys(marketData).find(k => k.toLowerCase() === itemName.toLowerCase());
        if (matchedKey) unitPriceSfl = marketData[matchedKey];
      }

      const totalValSfl = qty * unitPriceSfl;
      const totalValFiat = totalValSfl * flowerPrice;
      const category = getItemCategory(itemName);

      if (unitPriceSfl > 0) pricedItemsCount++;
      totalStockSfl += totalValSfl;

      items.push({
        name: itemName,
        qty,
        unitPriceSfl,
        totalValSfl,
        totalValFiat,
        category,
        emoji: getItemEmoji(itemName)
      });
    });

    const sflBalance = parseFloat(farmData?.land?.balance || 0);
    const sflBalanceFiat = sflBalance * flowerPrice;
    const totalNetWorthSfl = totalStockSfl + sflBalance;
    const totalNetWorthFiat = totalNetWorthSfl * flowerPrice;
    const uniqueCount = items.length;
    const priceCoverage = uniqueCount > 0 ? (pricedItemsCount / uniqueCount) * 100 : 0;

    return {
      items,
      totalStockSfl,
      totalStockFiat: totalStockSfl * flowerPrice,
      sflBalance,
      sflBalanceFiat,
      totalNetWorthSfl,
      totalNetWorthFiat,
      uniqueCount,
      pricedItemsCount,
      priceCoverage
    };
  }, [farmData, marketData, flowerPrice]);

  // Filtragem e Ordenação do Inventário
  const filteredInventory = useMemo(() => {
    return inventoryAnalysis.items
      .filter(item => {
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'value') return b.totalValSfl - a.totalValSfl;
        if (sortBy === 'qty') return b.qty - a.qty;
        return a.name.localeCompare(b.name);
      });
  }, [inventoryAnalysis.items, categoryFilter, searchTerm, sortBy]);

  const bumpkinXP = farmData?.bumpkin?.experience || 0;
  const bumpkinDetails = useMemo(() => getBumpkinXPDetails(bumpkinXP), [bumpkinXP]);

  const source = farmData?.source || 'public';
  const isOfficial = source === 'official';
  const isFromCache = farmData?.isFromCache || false;
  const officialError = farmData?.officialError || null;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">

      {/* HEADER DO PAINEL & STATUS DA CONEXÃO */}
      <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
            <span>🧑‍🌾</span> {t('farmDataTitle', currentLang)}
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>{t('infoDataProvider', currentLang)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOfficial ? (
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1.5 rounded-full font-bold border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              🔐 {t('dataSourceOfficial', currentLang)}
            </span>
          ) : (
            <span className="bg-blue-500/20 text-blue-300 text-xs px-3 py-1.5 rounded-full font-bold border border-blue-500/40 flex items-center gap-1.5 shadow-sm">
              🌐 {t('dataSourcePublic', currentLang)}
            </span>
          )}

          {isFromCache && (
            <span className="bg-amber-500/20 text-amber-300 text-xs px-3 py-1.5 rounded-full font-bold border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
              ⚡ {t('dataSourceCache', currentLang)}
            </span>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || !farmId}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 disabled:opacity-50 text-amber-300 font-bold rounded-full text-xs transition border border-slate-600 flex items-center gap-1.5 shadow-sm"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
            <span>{isRefreshing ? 'Carregando...' : t('btnRefresh', currentLang)}</span>
          </button>
        </div>
      </div>

      {/* BANNER REATIVO DE TRATAMENTO DE ERROS DA API */}
      {officialError && (
        <div className="rounded-xl p-4 border text-xs shadow-lg animate-fade-in space-y-1 bg-amber-950/60 border-amber-600/60 text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <span>⚠️</span>
            <span>Atenção na Consulta da API Oficial:</span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            {officialError.includes('401')
              ? t('err401Msg', currentLang)
              : officialError.includes('429')
              ? t('err429Msg', currentLang)
              : officialError}
          </p>
        </div>
      )}

      {/* BLOCO 1: CREDENCIAIS & CONEXÃO + SUPABASE CLOUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Form de Credenciais (Farm ID e API Key) */}
        <div className="lg:col-span-2 bg-slate-800/90 rounded-2xl p-5 border border-slate-700 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-amber-400 border-b border-slate-700/60 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">🔑 {t('profileTab', currentLang)}</span>
            <span className="text-[10px] text-slate-400 font-normal">Guarda local segura em localStorage</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Farm ID (ID da Fazenda)
              </label>
              <input
                type="text"
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                placeholder="Ex: 123456"
                className="w-full bg-slate-900 text-white px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 text-xs font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Community API Key (sfl.ey...)
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[10px] text-amber-400 hover:underline font-semibold"
                >
                  {showApiKey ? t('hideKey', currentLang) : t('showKey', currentLang)}
                </button>
              </div>
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('apiKeyPlaceholder', currentLang)}
                className="w-full bg-slate-900 text-white px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={onSaveProfile}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>💾</span> {t('btnSave', currentLang)}
            </button>

            {profileMsg.text && (
              <span className={`text-xs font-bold ${profileMsg.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {profileMsg.text}
              </span>
            )}
          </div>
        </div>

        {/* Account Cloud Sync Box */}
        <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-700/60 pb-2 flex items-center gap-2">
              ☁️ {t('authTitle', currentLang)}
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              {user ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {t('authStatusConnected', currentLang, { email: user.email })}
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  {t('authStatusGuest', currentLang)}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => syncCloud(user, true)}
                disabled={isSyncing}
                className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
              >
                {isSyncing ? <span className="animate-spin">⌛</span> : <span>🔄 Sincronizar</span>}
              </button>
            )}
            <button
              onClick={onOpenAuthModal}
              className={`flex-1 px-3 py-2 rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${
                user 
                  ? 'bg-slate-700 hover:bg-slate-600 text-amber-300 border border-slate-600' 
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {user ? <span>⚙️ Gerenciar</span> : <span>⚡ Entrar</span>}
            </button>
          </div>
        </div>

      </div>

      {/* BLOCO 2: VISÃO GERAL DA ILHA & ESTATÍSTICAS */}
      {farmData?.land && (
        <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              🏝️ {t('landInfo', currentLang)} - {farmData.land.type ? farmData.land.type.charAt(0).toUpperCase() + farmData.land.type.slice(1) : 'Unknown'}
            </h3>

            <div className="flex flex-wrap gap-2 text-xs">
              {farmData.land.verified && (
                <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                  ✅ {t('verified', currentLang)}
                </span>
              )}
              {farmData.land.vip && (
                <span className="bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full font-bold border border-purple-500/30 flex items-center gap-1">
                  👑 VIP {farmData.land.vip_info?.exp_text ? `(${farmData.land.vip_info.exp_text})` : ''}
                </span>
              )}
              <span className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full font-bold border border-blue-500/30">
                👥 Refs: {farmData.land.referrals?.totalReferrals || 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard label={t('level', currentLang)} value={farmData.land.level} icon="🏝️" />
            <StatCard label={t('balance', currentLang)} value={`${formatNum(inventoryAnalysis.sflBalance)} SFL`} subValue={`~${formatCurrency(inventoryAnalysis.sflBalanceFiat)}`} icon="💰" colorClass="text-emerald-400" />
            <StatCard label={t('coins', currentLang)} value={formatNum(farmData.land.coins)} icon="🪙" />
            <StatCard label={t('gem', currentLang)} value={formatNum(farmData.land.gem)} icon="💎" colorClass="text-cyan-400" />
            <StatCard label={t('marks', currentLang)} value={formatNum(farmData.land.marks)} icon="🏷️" colorClass="text-purple-400" />
            <StatCard label={t('charm', currentLang)} value={farmData.land.charm || 0} icon="💖" colorClass="text-rose-400" />
            <StatCard label={t('cheer', currentLang)} value={farmData.land.cheer || 0} icon="🎉" colorClass="text-amber-300" />
            <StatCard label={t('taxResource', currentLang)} value={`${((farmData.land.taxResource || 0) * 100).toFixed(1)}%`} icon="⚖️" colorClass="text-amber-400" />
          </div>
        </div>
      )}

      {/* BLOCO 3: VALORAÇÃO E PATRIMÔNIO ESTIMADO DA FAZENDA */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-6 border border-amber-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
              💎 {t('inventoryValuation', currentLang)}
            </span>
            <h3 className="text-2xl font-black text-amber-300 flex items-center gap-2">
              <span>{formatNum(inventoryAnalysis.totalNetWorthSfl)} SFL</span>
              <span className="text-base font-normal text-slate-400">({formatCurrency(inventoryAnalysis.totalNetWorthFiat)})</span>
            </h3>
            <span className="text-xs text-slate-400 block mt-1">
              {t('totalEstWorth', currentLang)} (Estoque + Saldo SFL)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('inventoryWorth', currentLang)}</span>
              <span className="text-xs font-bold text-emerald-400 mt-1 block">{formatNum(inventoryAnalysis.totalStockSfl)} SFL</span>
              <span className="text-[10px] text-slate-500 block">{formatCurrency(inventoryAnalysis.totalStockFiat)}</span>
            </div>

            <div className="text-center border-l border-r border-slate-800 px-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('uniqueResources', currentLang)}</span>
              <span className="text-xs font-bold text-amber-400 mt-1 block">{inventoryAnalysis.uniqueCount} itens</span>
              <span className="text-[10px] text-slate-500 block">no inventário</span>
            </div>

            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('priceCoverage', currentLang)}</span>
              <span className="text-xs font-bold text-cyan-400 mt-1 block">{inventoryAnalysis.priceCoverage.toFixed(0)}%</span>
              <span className="text-[10px] text-slate-500 block">cotados em P2P</span>
            </div>
          </div>
        </div>

        {/* BLOCO 4: INVENTÁRIO OFICIAL DETALHADO (GRID E FILTROS) */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>📦</span> {t('officialInventory', currentLang)} ({filteredInventory.length})
            </h4>

            <div className="flex flex-wrap items-center gap-2">
              {/* Campo de Busca */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchInventory', currentLang)}
                className="bg-slate-950 text-slate-100 text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 w-full sm:w-48"
              />

              {/* Ordenação */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400"
              >
                <option value="value">{t('sortByVal', currentLang)}</option>
                <option value="qty">{t('sortByQty', currentLang)}</option>
                <option value="name">{t('sortByName', currentLang)}</option>
              </select>
            </div>
          </div>

          {/* Categorias Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: t('catAll', currentLang), icon: '🌐' },
              { id: 'crops', label: t('catCrops', currentLang), icon: '🌾' },
              { id: 'resources', label: t('catResources', currentLang), icon: '⛏️' },
              { id: 'animals', label: t('catAnimals', currentLang), icon: '🐔' },
              { id: 'emblems', label: t('catEmblems', currentLang), icon: '🏺' },
              { id: 'other', label: t('catOther', currentLang), icon: '🌱' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  categoryFilter === cat.id
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Grid de Itens */}
          {filteredInventory.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {filteredInventory.map(item => (
                <div
                  key={item.name}
                  className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 hover:border-amber-500/40 transition flex flex-col justify-between group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xl group-hover:scale-110 transition-transform">{item.emoji}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded border border-slate-700/50">
                      {item.category}
                    </span>
                  </div>

                  <div className="mt-2">
                    <span className="text-xs font-bold text-slate-200 block truncate" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-sm font-extrabold text-amber-400 font-mono block mt-0.5">
                      {formatNum(item.qty)}
                    </span>
                  </div>

                  <div className="mt-2 border-t border-slate-800/80 pt-1.5 text-[10px] text-slate-400 font-mono space-y-0.5">
                    <div className="flex justify-between">
                      <span>P2P:</span>
                      <span className="text-slate-300">{item.unitPriceSfl > 0 ? `${formatNum(item.unitPriceSfl, 4)} SFL` : 's/ cotação'}</span>
                    </div>
                    {item.totalValSfl > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Total:</span>
                        <span>{formatNum(item.totalValSfl, 2)} SFL</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400 text-xs">
              <span>📦 {t('noInventoryItems', currentLang)}</span>
            </div>
          )}
        </div>
      </div>

      {/* BLOCO 5: PERFIL DO BUMPKIN & SKILLS ATIVAS */}
      {farmData?.bumpkin && (
        <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              🧑‍🌾 {t('bumpkinInfo', currentLang)}
            </h3>
            <span className="bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full font-bold border border-amber-500/30">
              Level {bumpkinDetails.level}
            </span>
          </div>

          {/* XP Level Progress Bar */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Progresso do Nível {bumpkinDetails.level}</span>
              <span className="font-mono text-amber-400 font-bold">{bumpkinDetails.progressPercent}%</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${bumpkinDetails.progressPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{formatNum(bumpkinDetails.currentXP)} Total XP</span>
              <span>Próximo Nível: {formatNum(bumpkinDetails.nextLevelXP)} XP</span>
            </div>
          </div>

          {/* Skills Ativas */}
          {farmData.bumpkin.skills && Object.keys(farmData.bumpkin.skills).length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                ⭐ {t('activeSkills', currentLang)} ({Object.keys(farmData.bumpkin.skills).length})
              </span>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {Object.keys(farmData.bumpkin.skills).map((skill, index) => (
                  <span
                    key={index}
                    className="bg-slate-900 text-amber-300 text-xs px-3 py-1.5 rounded-xl border border-slate-700 font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <span>✨</span>
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER & CRÉDITOS */}
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 text-center text-xs text-slate-400 space-y-1">
        <p className="font-bold text-slate-300">SflTrade v1.2.5 - Sunflower Land Management & P2P Dashboard</p>
        <p>Desenvolvido por Asaph Gabriel • {t('infoDataProvider', currentLang)}</p>
      </div>

    </div>
  );
};

export default FarmDashboard;
