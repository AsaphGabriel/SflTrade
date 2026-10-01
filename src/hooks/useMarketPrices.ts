import { useState, useEffect, useCallback, useMemo } from 'react';
import { t } from '../i18n';
import { fetchWithFallback, fetchNftMarketData } from '../services/api';
import { recordDailySnapshot, recordNftSnapshot } from '../services/historyService';
import { saveSettingsRemote } from '../services/syncService';

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

export default function useMarketPrices(user) {
  const [selectedIsland, setSelectedIsland] = useState(localStorage.getItem('sfl_island') || 'volcano');
  const [isVip, setIsVip] = useState(localStorage.getItem('sfl_vip') === 'true');
  const [isShrine, setIsShrine] = useState(localStorage.getItem('sfl_shrine') === 'true');
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('sfl_lang') || 'en');
  const [selectedCurrency, setSelectedCurrency] = useState(localStorage.getItem('sfl_currency') || 'usd');

  const [marketData, setMarketData] = useState(DADOS_PRECOS_INICIAIS);
  const [nftMarketData, setNftMarketData] = useState({ list: [], byName: {}, byId: {} });
  const [currencyRates, setCurrencyRates] = useState({ usd: 0.0679, brl: 0.4419, eur: 0.0754, sgd: 0.1117, pol: 1.194 });
  const [updatedTimeText, setUpdatedTimeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [customAvgPrices, setCustomAvgPrices] = useState(() => {
    try {
      const raw = localStorage.getItem('sfl_custom_avg_prices');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const updateIsland = useCallback((val) => {
    setSelectedIsland(val);
    localStorage.setItem('sfl_island', val);
    if (user) {
      setTimeout(() => {
        saveSettingsRemote(user.id, { selectedIsland: val, isVip, isShrine, selectedCurrency });
      }, 100);
    }
  }, [user, isVip, isShrine, selectedCurrency]);

  const updateVip = useCallback((val) => {
    setIsVip(val);
    localStorage.setItem('sfl_vip', String(val));
    if (user) {
      setTimeout(() => {
        saveSettingsRemote(user.id, { selectedIsland, isVip: val, isShrine, selectedCurrency });
      }, 100);
    }
  }, [user, selectedIsland, isShrine, selectedCurrency]);

  const updateShrine = useCallback((val) => {
    setIsShrine(val);
    localStorage.setItem('sfl_shrine', String(val));
    if (user) {
      setTimeout(() => {
        saveSettingsRemote(user.id, { selectedIsland, isVip, isShrine: val, selectedCurrency });
      }, 100);
    }
  }, [user, selectedIsland, isVip, selectedCurrency]);

  const updateCurrency = useCallback((val) => {
    setSelectedCurrency(val);
    localStorage.setItem('sfl_currency', val);
    if (user) {
      setTimeout(() => {
        saveSettingsRemote(user.id, { selectedIsland, isVip, isShrine, selectedCurrency: val });
      }, 100);
    }
  }, [user, selectedIsland, isVip, isShrine]);

  const updateCustomAvgPrice = useCallback((resourceName, avgSfl, flowerUsdRate) => {
    setCustomAvgPrices(prev => {
      const updated = { ...prev };
      if (!resourceName) return updated;
      const key = resourceName.toLowerCase();

      if (avgSfl === null && flowerUsdRate === null) {
        delete updated[key];
      } else {
        const sflVal = (avgSfl !== undefined && avgSfl !== null && !isNaN(avgSfl)) ? Number(avgSfl) : (updated[key]?.avgSfl ?? null);
        const flowerRateVal = (flowerUsdRate !== undefined && flowerUsdRate !== null && !isNaN(flowerUsdRate)) ? Number(flowerUsdRate) : (updated[key]?.flowerUsdRate ?? null);
        const avgUsdVal = (sflVal !== null && flowerRateVal !== null) ? (sflVal * flowerRateVal) : null;

        updated[key] = {
          avgSfl: sflVal,
          flowerUsdRate: flowerRateVal,
          avgUsd: avgUsdVal
        };
      }
      localStorage.setItem('sfl_custom_avg_prices', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const effectiveTax = useMemo(() => {
    if (selectedIsland === 'basic') return 0;
    const taxasBase = { petal: 0.50, desert: 0.20, volcano: 0.15 };
    let taxa = taxasBase[selectedIsland] || 0.15;
    if (isVip) taxa = taxa / 2;
    if (isShrine) taxa = Math.max(0, taxa - 0.025);
    return taxa;
  }, [selectedIsland, isVip, isShrine]);

  useEffect(() => { localStorage.setItem('sfl_lang', currentLang); }, [currentLang]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(false);
    let fetchedUsd = 0.087;

    try {
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
      const dataPrices = await fetchWithFallback('https://sfl.world/api/v1/prices');
      if (dataPrices) {
        const p2pData = dataPrices.data?.p2p || dataPrices.p2p;
        if (p2pData) {
          setMarketData(prev => ({ ...prev, ...p2pData }));
          setTimeout(() => {
            recordDailySnapshot(fetchedUsd, p2pData);
          }, 50);
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

    try {
      const nftRes = await fetchNftMarketData();
      if (nftRes && Array.isArray(nftRes.list)) {
        setNftMarketData(nftRes);
        setTimeout(() => {
          recordNftSnapshot(fetchedUsd, nftRes.list);
        }, 100);
      }
    } catch (err) {
      console.warn('[MarketData] Erro ao buscar NFTs com boost:', err);
    } finally {
      setLoading(false);
    }
  }, [currentLang]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const flowerPrice = currencyRates[selectedCurrency] || currencyRates.usd;
  const flowerPriceUsd = currencyRates.usd;

  return {
    selectedIsland, updateIsland,
    isVip, updateVip,
    isShrine, updateShrine,
    currentLang, setCurrentLang,
    selectedCurrency, updateCurrency,
    marketData, nftMarketData, currencyRates,
    updatedTimeText, loading, error,
    customAvgPrices, updateCustomAvgPrice,
    effectiveTax, refreshData,
    flowerPrice, flowerPriceUsd
  };
}
