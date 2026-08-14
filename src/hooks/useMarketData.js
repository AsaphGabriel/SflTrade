import { useState, useEffect, useCallback } from 'react';
import { t } from '../i18n';
import {
  fetchWithFallback,
  resolveFarmIdFromUsername,
  fetchFarmDataSmart
} from '../services/api';
import { recordDailySnapshot } from '../services/historyService';

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
  const [farmData, setFarmData] = useState(null);
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
    let fetchedUsd = 0.087;

    try {
      // Exchange API (sfl.world)
      const dataExchange = await fetchWithFallback('https://sfl.world/api/v1.1/exchange');
      if (dataExchange && dataExchange.sfl) {
        const sfl = dataExchange.sfl;
        fetchedUsd = sfl.usd || 0.087;
        setCurrencyRates({
          usd: fetchedUsd,
          brl: sfl.brl || 0.4419,
          eur: sfl.eur || 0.0754,
          sgd: sfl.sgd || 0.1117,
          pol: sfl.pol || 1.194
        });
      }
    } catch (err) {
      console.warn('[MarketData] Erro ao buscar cotações do exchange:', err);
    }

    try {
      // P2P Prices API (sfl.world)
      const dataPrices = await fetchWithFallback('https://sfl.world/api/v1/prices');
      if (dataPrices) {
        const p2pData = dataPrices.data?.p2p || dataPrices.p2p;
        if (p2pData) {
          setMarketData(prev => {
            const merged = { ...prev, ...p2pData };
            // Grava snapshot diário real no localStorage ('sfl_daily_history')
            recordDailySnapshot(fetchedUsd, merged);
            return merged;
          });
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
    } catch (err) {
      console.warn('[MarketData] Erro ao buscar preços P2P:', err);
      setError(true);
    }

    setLoading(false);
  }, [currentLang]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 3. Busca de Fazenda via Orquestrador Dual (Público vs Oficial Autenticado)
  const searchFarm = useCallback(async (query, apiKeyOverride = null, forceRefresh = false) => {
    if (!query) return;
    let landId = query;
    const apiKeyToUse = apiKeyOverride ?? localStorage.getItem('sfl_api_key') ?? '';

    // Se a busca for por Nickname, converte para Farm ID
    if (/[a-zA-Z]/.test(query)) {
      const resolvedId = await resolveFarmIdFromUsername(query);
      if (resolvedId) {
        landId = resolvedId;
      } else {
        console.warn(`[FarmSearch] Não foi possível encontrar Farm ID para o nick '${query}'`);
        return;
      }
    }

    try {
      const normalizedData = await fetchFarmDataSmart({
        farmId: landId,
        apiKey: apiKeyToUse,
        forceRefresh
      });

      if (normalizedData && normalizedData.land) {
        const land = normalizedData.land;
        if (land.type) setSelectedIsland(String(land.type).toLowerCase());
        if (land.vip !== undefined) setIsVip(Boolean(land.vip));
        if (land.shrine !== undefined) setIsShrine(Boolean(land.shrine));
        setFarmData(normalizedData);
      } else {
        setFarmData(null);
      }
    } catch (err) {
      console.error('[FarmSearch] Erro ao carregar dados da fazenda:', err);
      setFarmData(null);
    }
  }, []);

  // Carregar a fazenda automaticamente se já houver uma salva
  useEffect(() => {
    const savedFarm = localStorage.getItem('sfl_farm_id');
    if (savedFarm) {
      searchFarm(savedFarm);
    }
  }, [searchFarm]);

  const [customAvgPrices, setCustomAvgPrices] = useState(() => {
    try {
      const raw = localStorage.getItem('sfl_custom_avg_prices');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const updateCustomAvgPrice = (resourceName, avgSfl, avgUsd) => {
    setCustomAvgPrices(prev => {
      const updated = { ...prev };
      if (!resourceName) return updated;
      const key = resourceName.toLowerCase();

      if (avgSfl === null && avgUsd === null) {
        delete updated[key];
      } else {
        updated[key] = {
          avgSfl: (avgSfl !== undefined && avgSfl !== null && !isNaN(avgSfl)) ? Number(avgSfl) : (updated[key]?.avgSfl ?? null),
          avgUsd: (avgUsd !== undefined && avgUsd !== null && !isNaN(avgUsd)) ? Number(avgUsd) : (updated[key]?.avgUsd ?? null)
        };
      }
      localStorage.setItem('sfl_custom_avg_prices', JSON.stringify(updated));
      return updated;
    });
  };

  // 4. Cálculo de Posições do Portfólio (Estoque, Custo Médio e PnL Token vs Moeda Real)
  const portfolioData = (() => {
    const estoque = {};
    const defaultUsdRate = currencyRates.usd || 0.087;

    transactions.forEach(t => {
      const item = t.recurso;
      const key = item.toLowerCase();
      if (!estoque[key]) {
        estoque[key] = { nome: item, qty: 0, custoTotal: 0, custoTotalUsd: 0 };
      }
      if (t.tipo === 'buy') {
        estoque[key].qty += t.qty;
        estoque[key].custoTotal += t.totalPrice;
        // Salva custo de entrada em USD (se o registro antigo não tinha cotacao_entrada_usd, usa a cotação USD atual como fallback)
        const cotacaoTxUsd = t.cotacao_entrada_usd || defaultUsdRate;
        estoque[key].custoTotalUsd += (t.totalPrice * cotacaoTxUsd);
      } else if (t.tipo === 'sell') {
        const qtyAntes = estoque[key].qty;
        const precoMedioAntesSfl = qtyAntes > 0 ? (estoque[key].custoTotal / qtyAntes) : 0;
        const precoMedioAntesUsd = qtyAntes > 0 ? (estoque[key].custoTotalUsd / qtyAntes) : 0;
        estoque[key].qty -= t.qty;
        estoque[key].custoTotal -= (t.qty * precoMedioAntesSfl);
        estoque[key].custoTotalUsd -= (t.qty * precoMedioAntesUsd);
      }
    });

    const usdRate = currencyRates.usd || 0.087;
    const selectedRate = currencyRates[selectedCurrency] || usdRate;
    // Proporção de conversão da moeda selecionada em relação ao USD (ex: se selecionou BRL, converte via taxa BRL / USD)
    const currencyRatio = usdRate > 0 ? (selectedRate / usdRate) : 1;

    return Object.keys(estoque)
      .filter(key => estoque[key].qty > 0.0001)
      .map(key => {
        const item = estoque[key];
        let precoMedio = item.qty > 0 ? (item.custoTotal / item.qty) : 0; // em SFL
        let precoMedioUsd = item.qty > 0 ? (item.custoTotalUsd / item.qty) : 0; // em USD

        // Aplica ajuste manual de Preço Médio (se configurado pelo usuário)
        const customOverride = customAvgPrices[key] || customAvgPrices[item.nome.toLowerCase()];
        if (customOverride) {
          if (customOverride.avgSfl !== null && !isNaN(customOverride.avgSfl)) {
            precoMedio = Number(customOverride.avgSfl);
          }
          if (customOverride.avgUsd !== null && !isNaN(customOverride.avgUsd)) {
            precoMedioUsd = Number(customOverride.avgUsd);
          }
        }

        const custoTotal = item.qty * precoMedio;
        const custoTotalUsd = item.qty * precoMedioUsd;

        const precoP2P = marketData[item.nome] || marketData[Object.keys(marketData).find(k => k.toLowerCase() === key)] || 0;
        const precoVendaLiquidoUnitario = precoP2P * (1 - effectiveTax);
        const valorVendaLiquidoTotal = item.qty * precoVendaLiquidoUnitario; // em SFL
        
        // Lucro em Tokens ($FLOWER)
        const lucroAbsoluto = valorVendaLiquidoTotal - custoTotal;
        const lucroPercentual = custoTotal > 0 ? (lucroAbsoluto / custoTotal) * 100 : 0;

        // Lucro Real em USD e Moeda Selecionada (USD / BRL / etc.)
        const valorVendaLiquidoTotalUsd = valorVendaLiquidoTotal * usdRate;
        const lucroAbsolutoUsd = valorVendaLiquidoTotalUsd - custoTotalUsd;
        const lucroPercentualUsd = custoTotalUsd > 0 ? (lucroAbsolutoUsd / custoTotalUsd) * 100 : 0;

        const custoTotalMoeda = custoTotalUsd * currencyRatio;
        const valorVendaLiquidoTotalMoeda = valorVendaLiquidoTotal * selectedRate;
        const lucroAbsolutoMoeda = valorVendaLiquidoTotalMoeda - custoTotalMoeda;
        const lucroPercentualMoeda = custoTotalMoeda > 0 ? (lucroAbsolutoMoeda / custoTotalMoeda) * 100 : 0;

        return {
          ...item,
          precoMedio,
          precoMedioUsd,
          custoTotal,
          custoTotalUsd,
          valorVendaLiquidoTotalUsd,
          lucroAbsolutoUsd,
          lucroPercentualUsd,
          precoP2P,
          precoVendaLiquidoUnitario,
          valorVendaLiquidoTotal,
          lucroAbsoluto,
          lucroPercentual,
          custoTotalMoeda,
          valorVendaLiquidoTotalMoeda,
          lucroAbsolutoMoeda,
          lucroPercentualMoeda
        };
      });
  })();

  // 5. Registrar Transação (Compra / Venda)
  const handleTransaction = (nuevaTransacao) => {
    // Ao registrar compra, salva no LocalStorage a cotação do $FLOWER em USD no momento da entrada e valor total USD
    const cotacaoEntrada = nuevaTransacao.cotacao_entrada_usd ?? currencyRates.usd ?? 0.087;
    const totalPriceUsd = (nuevaTransacao.totalPrice || (nuevaTransacao.qty * nuevaTransacao.unitPrice)) * cotacaoEntrada;

    setTransactions(prev => [
      ...prev,
      {
        ...nuevaTransacao,
        cotacao_entrada_usd: cotacaoEntrada,
        token_price_usd_at_purchase: cotacaoEntrada,
        total_price_usd: totalPriceUsd,
        id: Date.now(),
        timestamp: new Date().toISOString()
      }
    ]);
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
    transactions,
    farmData,
    refreshData,
    handleTransaction,
    updateCustomAvgPrice,
    searchFarm,
    updatedTimeText,
    loading,
    error
  };
}