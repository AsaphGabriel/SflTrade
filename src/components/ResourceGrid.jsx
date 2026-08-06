import React, { useState } from 'react';
import { t } from '../i18n';

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
  }
];

const TRANSPARENT_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3C/svg%3E";

function getItemIcon(itemName) {
  if (!itemName) return TRANSPARENT_FALLBACK;
  return `https://sfl.world/img/source/${encodeURIComponent(itemName)}.png`;
}

function getCategoryIcon(catId) {
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
    if (cat.itens.some(i => i.toLowerCase() === nomeItem.toLowerCase())) {
      return cat.id;
    }
  }
  return 'misc';
}

const ResourceGrid = ({ data = {}, currentLang = 'en', onOpenBuy, onOpenSell }) => {
  const [currentCategoryFilter, setCurrentCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Agrupamento de itens por categoria
  const grupos = {};
  CATEGORIAS_MERCADO.forEach(cat => { grupos[cat.id] = []; });

  Object.keys(data).forEach(item => {
    const catId = obterCategoriaItem(item);
    if (!grupos[catId]) grupos[catId] = [];
    grupos[catId].push(item);
  });

  // Categorias que devem ser renderizadas na tela
  const categoriesToRender = currentCategoryFilter === 'all'
    ? CATEGORIAS_MERCADO
    : CATEGORIAS_MERCADO.filter(cat => cat.id === currentCategoryFilter);

  // Construção da lista de Abas
  const tabs = [
    { id: 'all', key: 'marketTabAll' },
    ...CATEGORIAS_MERCADO.map(cat => ({ id: cat.id, key: cat.titleKey }))
  ];

  return (
    <section className="mb-8">
      {/* Topo da Seção de Mercado com Busca */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-slate-200">
          {t('marketTitle', currentLang)}
        </h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchPlaceholder', currentLang)}
          className="bg-cardbg border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 w-44 md:w-56"
        />
      </div>

      {/* Barra de Abas Amarelas por Categoria */}
      <div id="category-tabs" className="category-tabs-bar scrollbar-hide" role="tablist">
        {tabs.map(tab => {
          const count = tab.id === 'all'
            ? Object.keys(data).length
            : (CATEGORIAS_MERCADO.find(c => c.id === tab.id)?.itens.filter(i => data[i] !== undefined).length || 0);

          const isActive = currentCategoryFilter === tab.id;
          const iconUrl = tab.id !== 'all' ? getCategoryIcon(tab.id) : '';

          return (
            <button
              key={tab.id}
              className={`category-tab ${isActive ? 'active' : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setCurrentCategoryFilter(tab.id)}
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
                {t(cat.titleKey, currentLang)}
              </h3>

              <div className="category-grid">
                {itens.map(item => {
                  const precoAtual = data[item];
                  const iconUrl = getItemIcon(item);

                  return (
                    <div key={item} className="market-card item-card">
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
                          onClick={() => onOpenBuy && onOpenBuy(item)}
                          className="btn-buy-card"
                        >
                          {t('cardBuy', currentLang)}
                        </button>
                        <button
                          onClick={() => onOpenSell && onOpenSell(item)}
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
      </div>
    </section>
  );
};

export default ResourceGrid;