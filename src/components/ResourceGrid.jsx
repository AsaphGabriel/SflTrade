import React, { useState } from 'react';
import { t } from '../i18n';
import PriceChartModal from './PriceChartModal';

// Definição das Categorias e Itens
const CATEGORIAS_MERCADO = [
  {
    id: 'crops',
    titleKey: 'cat_crops',
    itens: [
      "Sunflower", "Potato", "Pumpkin", "Carrot", "Cabbage", "Beetroot",
      "Cauliflower", "Parsnip", "Eggplant", "Corn", "Radish", "Wheat",
      "Kale", "Barley", "Soybean", "Rice", "Tomato", "Zucchini", "Yam",
      "Rhubarb", "Artichoke", "Onion", "Pepper", "Broccoli", "Turnip"
    ]
  },
  {
    id: 'fruits',
    titleKey: 'cat_fruits',
    itens: [
      "Apple", "Orange", "Blueberry", "Banana", "Lemon", "Olive",
      "Grape", "Duskberry", "Celestine", "Lunara"
    ]
  },
  {
    id: 'animals',
    titleKey: 'cat_animals',
    itens: [
      "Egg", "Milk", "Wool", "Merino Wool", "Leather", "Feather", "Honey"
    ]
  },
  {
    id: 'minerals',
    titleKey: 'cat_minerals',
    itens: [
      "Wood", "Stone", "Iron", "Gold", "Crimstone", "Obsidian", "Salt"
    ]
  },
  {
    id: 'misc',
    titleKey: 'cat_misc',
    itens: [
      "Capsule Bait", "Chewed Bone", "Crimson Baitfish", "Umbrella Bait",
      "Bumpkin Emblem", "Goblin Emblem", "Nightshade Emblem",
      "Sunflorian Emblem", "Ruffroot", "Heart Leaf", "Moonfur",
      "Ribbon", "Dewberry", "Frost Pebble", "Wild Grass", "Saltwort"
    ]
  },
  {
    id: 'power_ups',
    titleKey: 'cat_power_ups',
    isNftCategory: true,
    itens: []
  }
];

const TRANSPARENT_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3C/svg%3E";

function getItemIcon(itemName) {
  if (!itemName) return TRANSPARENT_FALLBACK;
  return `https://sfl.world/img/source/${encodeURIComponent(itemName)}.png`;
}

function getCategoryIcon(catId, sampleNft = '') {
  if (catId === 'power_ups') {
    return 'https://sunflower-land.com/play/erc1155/images/2129.webp';
  }
  const assetMap = {
    crops: 'Sunflower',
    fruits: 'Apple',
    animals: 'Egg',
    minerals: 'Wood',
    misc: 'Sunflorian Emblem'
  };
  const itemName = assetMap[catId];
  return itemName ? getItemIcon(itemName) : '';
}

function formatarPreco(valor) {
  if (valor === undefined || valor === null || isNaN(valor)) return '0';
  const num = Number(valor);
  if (num === 0) return '0';
  if (num >= 10) return num.toFixed(2);
  if (num >= 1) return num.toFixed(3);
  return parseFloat(num.toPrecision(3)).toString();
}

function obterCategoriaItem(nomeItem) {
  for (const cat of CATEGORIAS_MERCADO) {
    if (cat.itens && cat.itens.some(i => i.toLowerCase() === nomeItem.toLowerCase())) {
      return cat.id;
    }
  }
  return 'misc';
}

const ResourceGrid = ({
  data = {},
  nftData = { list: [] },
  currentLang = 'en',
  onOpenBuy,
  onOpenSell,
  categoryFilter = null,
  onCategoryFilterChange = null,
  searchTerm: externalSearchTerm = null,
  onSearchTermChange = null
}) => {
  // ── Categoria ───────────────────────────────────────────────────────────────
  const [internalCategoryFilter, setInternalCategoryFilter] = useState('all');
  const currentCategoryFilter = (categoryFilter !== null && categoryFilter !== undefined)
    ? categoryFilter
    : internalCategoryFilter;

  const handleSelectCategory = (catId) => {
    setInternalCategoryFilter(catId);
    if (onCategoryFilterChange) onCategoryFilterChange(catId);
  };

  // ── Busca — fonte única de verdade ──────────────────────────────────────────
  // Quando operado em modo controlado (parent fornece onSearchTermChange), o
  // termo de busca efetivo É o externalSearchTerm. Nunca mantemos estado interno
  // para evitar race conditions entre renders do parent e do filho.
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const isControlled = onSearchTermChange !== null;
  const searchTerm = isControlled
    ? (externalSearchTerm ?? '')   // controlado: sempre usa o valor do parent
    : internalSearchTerm;          // autônomo: usa estado interno

  const handleSearchChange = (val) => {
    if (isControlled) {
      // Modo controlado: reseta aba se necessário, propaga pro parent
      if (val.trim() && currentCategoryFilter !== 'all') {
        setInternalCategoryFilter('all');
        if (onCategoryFilterChange) onCategoryFilterChange('all');
      }
      onSearchTermChange(val);
    } else {
      // Modo autônomo: gerencia estado interno
      if (val.trim() && currentCategoryFilter !== 'all') {
        setInternalCategoryFilter('all');
      }
      setInternalSearchTerm(val);
    }
  };

  const [selectedChartResource, setSelectedChartResource] = useState(null);

  // Agrupamento de itens por categoria
  const grupos = {};
  CATEGORIAS_MERCADO.forEach(cat => { grupos[cat.id] = []; });

  Object.keys(data).forEach(item => {
    const catId = obterCategoriaItem(item);
    if (!grupos[catId]) grupos[catId] = [];
    grupos[catId].push(item);
  });

  const nftList = Array.isArray(nftData?.list) ? nftData.list : [];
  const firstNftName = nftList.length > 0 ? nftList[0].name : 'Stone Beetle';

  const term = searchTerm.trim().toLowerCase();
  const isSearching = Boolean(term);

  // Helper para verificar correspondencia de NFT
  const matchesNft = (item) => {
    if (!isSearching) return true;
    const nameMatch = item.name && item.name.toLowerCase().includes(term);
    const displayMatch = item.displayName && item.displayName.toLowerCase().includes(term);
    const boostMatch = item.boost_text && item.boost_text.toLowerCase().includes(term);
    const collectionMatch = item.collection && item.collection.toLowerCase().includes(term);
    return Boolean(nameMatch || displayMatch || boostMatch || collectionMatch);
  };

  // Quando há busca ativa, SEMPRE avalia todas as categorias (ignora filtro de aba ativo).
  // O filtro de aba só restringe a visualização quando não há busca.
  const categoriesToRender = isSearching
    ? CATEGORIAS_MERCADO
    : (currentCategoryFilter === 'all'
        ? CATEGORIAS_MERCADO
        : CATEGORIAS_MERCADO.filter(cat => cat.id === currentCategoryFilter));

  // Total de correspondencias durante a busca
  const totalMatches = isSearching
    ? CATEGORIAS_MERCADO.reduce((acc, cat) => {
        if (cat.isNftCategory) {
          return acc + nftList.filter(matchesNft).length;
        } else {
          return acc + (grupos[cat.id] || []).filter(item => item.toLowerCase().includes(term)).length;
        }
      }, 0)
    : 1;

  // Construcao da lista de Abas
  const tabs = [
    { id: 'all', key: 'marketTabAll' },
    ...CATEGORIAS_MERCADO.map(cat => ({ id: cat.id, key: cat.titleKey, isNft: cat.isNftCategory }))
  ];

  return (
    <section className="mb-8">
      {/* Topo da Secao de Mercado com Busca */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-slate-200">
          {t('marketTitle', currentLang)}
        </h2>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder', currentLang)}
            className="bg-cardbg border border-slate-700 text-white rounded-xl pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:border-amber-400 w-48 md:w-64"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold leading-none"
              title={currentLang === 'pt' ? 'Limpar busca' : 'Clear search'}
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* Barra de Abas Amarelas por Categoria com Contagens Dinamicas */}
      <div id="category-tabs" className="category-tabs-bar scrollbar-hide" role="tablist">
        {tabs.map(tab => {
          let count = 0;
          if (isSearching) {
            if (tab.id === 'all') {
              count = totalMatches;
            } else if (tab.isNft) {
              count = nftList.filter(matchesNft).length;
            } else {
              count = (grupos[tab.id] || []).filter(item => item.toLowerCase().includes(term)).length;
            }
          } else {
            count = tab.id === 'all'
              ? (Object.keys(data).length + nftList.length)
              : tab.isNft
              ? nftList.length
              : (CATEGORIAS_MERCADO.find(c => c.id === tab.id)?.itens.filter(i => data[i] !== undefined).length || 0);
          }

          const isActive = currentCategoryFilter === tab.id;
          const iconUrl = tab.id !== 'all' ? getCategoryIcon(tab.id, firstNftName) : '';

          return (
            <button
              key={tab.id}
              className={`category-tab ${isActive ? 'active' : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelectCategory(tab.id)}
            >
              {iconUrl && (
                <img
                  src={iconUrl}
                  alt={tab.id}
                  className="category-tab-icon"
                  onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                />
              )}
              <span>{t(tab.key, currentLang)}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grade Principal de Categorias e Cartões */}
      <div className="market-categories-container">
        {categoriesToRender.map(cat => {
          // Renderizacao especial para categoria de Power Ups (NFTs)
          if (cat.isNftCategory) {
            let nftsToRender = isSearching ? nftList.filter(matchesNft) : [...nftList];

            if (nftsToRender.length === 0) return null;

            // Ordenação: menor Floor Price -> maior Floor Price
            nftsToRender.sort((a, b) => (Number(a.floor) || 0) - (Number(b.floor) || 0));

            return (
              <div key={cat.id} className="category-block">
                <h3 className="market-category-title">
                  {getCategoryIcon(cat.id, firstNftName) && (
                    <img
                      src={getCategoryIcon(cat.id, firstNftName)}
                      alt={cat.id}
                      className="w-5 h-5 object-contain inline-block"
                      onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                    />
                  )}
                  <span>{t(cat.titleKey, currentLang)}</span>
                </h3>

                <div className="category-grid">
                  {nftsToRender.map(nft => {
                    const iconUrl = nft.image || (nft.collection === 'wearables'
                      ? `https://sunflower-land.com/play/wearables/images/${nft.id}.png`
                      : `https://sunflower-land.com/play/erc1155/images/${nft.id}.webp`);

                    return (
                      <div 
                        key={nft.id || nft.name} 
                        className="market-card item-card cursor-pointer hover:border-amber-400 flex flex-col justify-between"
                        onClick={() => setSelectedChartResource({ name: nft.displayName || nft.name, nft_id: nft.id, isNft: true, floor: nft.floor, boost_text: nft.boost_text })}
                        title={currentLang === 'pt' ? 'Clique para ver gráfico de Floor Price e médias móveis' : 'Click to view Floor Price and moving average chart'}
                      >
                        <div>
                          <div className="market-card-img-wrap">
                            <img
                              src={iconUrl}
                              alt={nft.displayName || nft.name}
                              onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                            />
                          </div>
                          <div className="market-card-info">
                            <div className="market-card-name truncate" title={nft.displayName || nft.name}>{nft.displayName || nft.name}</div>
                            <div className="market-card-price text-amber-300 font-bold">{formatarPreco(nft.floor)} SFL</div>
                            {nft.boost_text && (
                              <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded mt-1 max-w-full text-center leading-tight line-clamp-1" title={nft.boost_text}>
                                {nft.boost_text}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="market-card-actions mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenBuy) onOpenBuy(nft.displayName || nft.name, { isNft: true, nft_id: nft.id, unitPrice: nft.floor, boost_text: nft.boost_text });
                            }}
                            className="btn-buy-card"
                          >
                            {t('cardBuy', currentLang)}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenSell) onOpenSell(nft.displayName || nft.name, { isNft: true, nft_id: nft.id, unitPrice: nft.floor, boost_text: nft.boost_text });
                            }}
                            className="btn-sell-card"
                          >
                            {t('cardSell', currentLang)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          let itens = grupos[cat.id] || [];

          // Filtro do campo de busca
          if (searchTerm.trim() !== '') {
            itens = itens.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()));
          }

          if (itens.length === 0) return null;

          // Ordenação: menor preço P2P -> maior preço P2P
          itens.sort((a, b) => (data[a] || 0) - (data[b] || 0));

          return (
            <div key={cat.id} className="category-block">
              <h3 className="market-category-title">
                {getCategoryIcon(cat.id) && (
                  <img
                    src={getCategoryIcon(cat.id)}
                    alt={cat.id}
                    className="w-5 h-5 object-contain inline-block"
                    onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                  />
                )}
                <span>{t(cat.titleKey, currentLang)}</span>
              </h3>

              <div className="category-grid">
                {itens.map(item => {
                  const precoAtual = data[item];
                  const iconUrl = getItemIcon(item);

                  return (
                    <div 
                      key={item} 
                      className="market-card item-card cursor-pointer hover:border-amber-400"
                      onClick={() => setSelectedChartResource(item)}
                      title={currentLang === 'pt' ? 'Clique para ver gráfico de histórico e médias móveis' : 'Click to view history and moving average chart'}
                    >
                      <div className="market-card-img-wrap">
                        <img
                          src={iconUrl}
                          alt={item}
                          onError={(e) => { e.target.src = TRANSPARENT_FALLBACK; }}
                        />
                      </div>
                      <div className="market-card-info">
                        <div className="market-card-name">{item}</div>
                        <div className="market-card-price">{formatarPreco(precoAtual)} SFL</div>
                      </div>
                      <div className="market-card-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenBuy) onOpenBuy(item);
                          }}
                          className="btn-buy-card"
                        >
                          {t('cardBuy', currentLang)}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenSell) onOpenSell(item);
                          }}
                          className="btn-sell-card"
                        >
                          {t('cardSell', currentLang)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Mensagem amigável de nenhum resultado encontrado na busca */}
        {isSearching && totalMatches === 0 && (
          <div className="text-center py-10 text-slate-400 text-xs bg-cardbg rounded-xl border border-slate-700/60 p-6 my-4">
            <p className="text-slate-300 font-semibold mb-1">
              {t('noItemFound', currentLang)}
            </p>
            <p className="text-slate-500 text-[11px]">
              {currentLang === 'pt'
                ? `Nenhum recurso ou NFT corresponde à busca "${searchTerm}".`
                : `No resource or NFT matches "${searchTerm}".`}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Gráficos e Séries Temporais */}
      {selectedChartResource && (
        <PriceChartModal
          resourceId={selectedChartResource}
          currentLang={currentLang}
          onClose={() => setSelectedChartResource(null)}
        />
      )}
    </section>
  );
};

export default ResourceGrid;