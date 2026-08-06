import { useState, useEffect, useCallback } from 'react';
import { t } from '../i18n';

// Base de preços de contingência (Fallback local offline)
const DADOS_PRECOS_INICIAIS = {
  "Sunflower":0.0003666, "Potato":0.0004439, "Pumpkin":0.0010799, "Carrot":0.002097, 
  "Cabbage":0.00195, "Beetroot":0.0059949, "Cauliflower":0.00848357, "Parsnip":0.013094, 
  "Radish":0.00952, "Wheat":0.015444, "Kale":0.01795937, "Apple":0.0226, 
  "Blueberry":0.018295, "Orange":0.01775, "Eggplant":0.01, "Corn":0.015394, 
  "Banana":0.02304286, "Soybean":0.002496, "Grape":0.24942, "Rice":0.3114, 
  "Olive":0.392, "Tomato":0.00499, "Lemon":0.009264, "Barley":0.027574, 
  "Rhubarb":0.00091667, "Zucchini":0.000704, "Yam":0.003516, "Broccoli":0.004376, 
  "Pepper":0.00618, "Onion":0.01431164, "Turnip":0.014473, "Artichoke":0.0119989, 
  "Duskberry":0.999, "Lunara":0.48742, "Celestine":0.18872, "Wood":0.01228153, 
  "Stone":0.0264, "Iron":0.104495, "Gold":0.3647, "Egg":0.02153077, 
  "Honey":0.11294, "Crimstone":0.7899, "Leather":0.09798, "Wool":0.04218, 
  "Merino Wool":0.013588, "Feather":0.00857083, "Milk":0.1122, "Obsidian":21.5898, 
  "Salt":0.00423867, "Goblin Emblem":0.08, "Bumpkin Emblem":0.0898, 
  "Sunflorian Emblem":0.0869, "Nightshade Emblem":0.067399, "Ruffroot":0.4173, 
  "Chewed Bone":0.4069, "Heart Leaf":0.4048, "Moonfur":3.799, "Ribbon":0.4094, 
  "Dewberry":0.445, "Wild Grass":0.4248, "Frost Pebble":0.4151, "Capsule Bait":0.01675, 
  "Umbrella Bait":0.0254, "Crimson Baitfish":0.0404, "Saltwort":0.03836
};

// Requisição via Worker Cloudflare
async function fetchJsonSmart(url) {
  const workerUrl = 'https://sfltrade.asaphgabrielsousa.workers.dev/?url=' + encodeURIComponent(url);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(workerUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const match = text.match(/<pre>([\s\S]*?)<\/pre>/);
    if (match) return JSON.parse(match[1]);
    
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (error) {
    console.error(`[SmartFetch] Falha ao buscar: ${url}`, error);
    return null;
  }
}

export default function useMarketData() {
  // Configurações do Usuário e Persistência
  const [selectedIsland, setSelectedIsland] = useState(localStorage.getItem('sfl_island') || 'volcano');
  const [isVip, setIsVip] = useState(localStorage.getItem('sfl_vip') === 'true');
  const [isShrine, setIsShrine] = useState(localStorage.getItem('sfl_shrine') === 'true');
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('sfl_lang') || 'en');
  const [selectedCurrency, setSelectedCurrency] = useState(localStorage.getItem('sfl_currency') || 'usd');

  // Dados do Mercado e Estado Geral
  const [marketData, setMarketData] = useState(DADOS_PRECOS_INICIAIS);
  const [currencyRates, setCurrencyRates] = useState({ usd: 0.0679, brl: 0.4419, eur: 0.0754, sgd: 0.1117, pol: 1.194 });
  const [updatedTimeText, setUpdatedTimeText] = useState('');
  const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem('sfl_transactions')) || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 1. Cálculo da Taxa Efetiva
  const effectiveTax = (() => {
    if (selectedIsland === 'basic') return 0;
    const taxasBase = { petal: 0.50, desert: 0.20, volcano: 0.15 };
    let taxa = taxasBase[selectedIsland] || 0.15;
    if (isVip) taxa = taxa / 2;
    if (isShrine) taxa = Math.max(0, taxa - 0.025);
    return taxa;
  })();

  // Salva preferências no localStorage
  useEffect(() => { localStorage.setItem('sfl_island', selectedIsland); }, [selectedIsland]);
  useEffect(() => { localStorage.setItem('sfl_vip', isVip); }, [isVip]);
  useEffect(() => { localStorage.setItem('sfl_shrine', isShrine); }, [isShrine]);
  useEffect(() => { localStorage.setItem('sfl_lang', currentLang); }, [currentLang]);
  useEffect(() => { localStorage.setItem('sfl_currency', selectedCurrency); }, [selectedCurrency]);
  useEffect(() => { localStorage.setItem('sfl_transactions', JSON.stringify(transactions)); }, [transactions]);

  // 2. Busca Cotações da API
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(false);

    // Exchange API
    const dataExchange = await fetchJsonSmart('https://sfl.world/api/v1.1/exchange');
    if (dataExchange && dataExchange.sfl) {
      const sfl = dataExchange.sfl;
      setCurrencyRates({
        usd: sfl.usd || 0.087,
        brl: sfl.brl || 0.4419,
        eur: sfl.eur || 0.0754,
        sgd: sfl.sgd || 0.1117,
        pol: sfl.pol || 1.194
      });
    }

    // P2P Prices API
    const dataPrices = await fetchJsonSmart('https://sfl.world/api/v1/prices');
    if (dataPrices) {
      const p2pData = dataPrices.data?.p2p || dataPrices.p2p;
      if (p2pData) {
        setMarketData(prev => ({ ...prev, ...p2pData }));
      }

      const updatedText = dataPrices.updated_text || dataPrices.data?.updated_text;
      if (updatedText) {
        setUpdatedTimeText(currentLang === 'pt' ? `• Atualizado ${updatedText.replace('minutes ago', 'min atrás')}` : `• Updated ${updatedText}`);
      } else {
        setUpdatedTimeText(t('updatedNow', currentLang));
      }
    } else {
      setError(true);
    }

    setLoading(false);
  }, [currentLang]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 3. Cálculo de Posições do Portfólio (Estoque, Custo Médio e PnL)
  const portfolioData = (() => {
    const estoque = {};
    transactions.forEach(t => {
      const item = t.recurso;
      const key = item.toLowerCase();
      if (!estoque[key]) {
        estoque[key] = { nome: item, qty: 0, custoTotal: 0 };
      }
      if (t.tipo === 'buy') {
        estoque[key].qty += t.qty;
        estoque[key].custoTotal += t.totalPrice;
      } else if (t.tipo === 'sell') {
        const precoMedioAntes = estoque[key].qty > 0 ? (estoque[key].custoTotal / estoque[key].qty) : 0;
        estoque[key].qty -= t.qty;
        estoque[key].custoTotal -= (t.qty * precoMedioAntes);
      }
    });

    return Object.keys(estoque)
      .filter(key => estoque[key].qty > 0.0001)
      .map(key => {
        const item = estoque[key];
        const precoMedio = item.custoTotal / item.qty;
        const precoP2P = marketData[item.nome] || marketData[Object.keys(marketData).find(k => k.toLowerCase() === key)] || 0;
        const precoVendaLiquidoUnitario = precoP2P * (1 - effectiveTax);
        const valorVendaLiquidoTotal = item.qty * precoVendaLiquidoUnitario;
        const lucroAbsoluto = valorVendaLiquidoTotal - item.custoTotal;
        const lucroPercentual = item.custoTotal > 0 ? (lucroAbsoluto / item.custoTotal) * 100 : 0;

        return {
          ...item,
          precoMedio,
          precoP2P,
          precoVendaLiquidoUnitario,
          valorVendaLiquidoTotal,
          lucroAbsoluto,
          lucroPercentual
        };
      });
  })();

  // 4. Registrar Transação (Compra / Venda)
  const handleTransaction = (nuevaTransacao) => {
    setTransactions(prev => [...prev, { ...nuevaTransacao, id: Date.now(), timestamp: new Date().toISOString() }]);
  };

  // 5. Busca de Fazenda por Username ou Farm ID
  const searchFarm = async (query) => {
    if (!query) return;
    let landId = query;

    if (/[a-zA-Z]/.test(query)) {
      const data = await fetchJsonSmart('https://sfl.world/api/v1/land/info/username/' + encodeURIComponent(query));
      if (data && data.nft_id) landId = data.nft_id;
      else return;
    }

    const dataLand = await fetchJsonSmart(`https://sfl.world/api/v1.1/land/${landId}`);
    if (dataLand && dataLand.land) {
      const land = dataLand.land;
      if (land.type) setSelectedIsland(land.type.toLowerCase());
      if (land.vip !== undefined) setIsVip(land.vip);
      if (land.shrine !== undefined) setIsShrine(land.shrine);
    }
  };

  const flowerPrice = currencyRates[selectedCurrency] || currencyRates.usd;

  return {
    flowerPrice,
    effectiveTax,
    selectedIsland,
    setSelectedIsland,
    isVip,
    setIsVip,
    isShrine,
    setIsShrine,
    currentLang,
    setCurrentLang,
    selectedCurrency,
    setSelectedCurrency,
    marketData,
    portfolioData,
    refreshData,
    handleTransaction,
    searchFarm,
    updatedTimeText,
    loading,
    error
  };
}