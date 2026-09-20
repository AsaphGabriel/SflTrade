import { useCallback, useMemo } from 'react';
import useAuthSync from './useAuthSync';
import useMarketPrices from './useMarketPrices';
import useFarmProfile from './useFarmProfile';
import { saveTransactionRemote } from '../services/syncService';

export default function useMarketData() {
  const {
    user, setUser,
    isAuthModalOpen, setIsAuthModalOpen,
    isSyncing, transactions, setTransactions,
    syncCloud
  } = useAuthSync((settings) => {
    if (settings.preferred_currency) updateCurrency(String(settings.preferred_currency).toLowerCase());
    if (settings.vip_active !== undefined) updateVip(Boolean(settings.vip_active));
    if (settings.shrine_active !== undefined) updateShrine(Boolean(settings.shrine_active));
  });

  const {
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
  } = useMarketPrices(user);

  const { farmData, setFarmData, searchFarm } = useFarmProfile((land) => {
    if (land.type) updateIsland(String(land.type).toLowerCase());
    if (land.vip !== undefined) updateVip(Boolean(land.vip));
    if (land.shrine !== undefined) updateShrine(Boolean(land.shrine));
  });

  const portfolioData = useMemo(() => {
    const estoque = {};
    const defaultUsdRate = currencyRates.usd || 0.087;

    transactions.forEach(t => {
      const item = t.recurso;
      if (!item) return;
      const key = t.isNft ? `${item.toLowerCase()}_nft` : item.toLowerCase();
      if (!estoque[key]) {
        estoque[key] = {
          nome: item,
          qty: 0,
          custoTotal: 0,
          custoTotalUsd: 0,
          isNft: Boolean(t.isNft),
          nft_id: t.nft_id || null,
          boost_text: t.boost_text || ''
        };
      }
      if (t.isNft) {
        estoque[key].isNft = true;
        if (t.boost_text) estoque[key].boost_text = t.boost_text;
        if (t.nft_id) estoque[key].nft_id = t.nft_id;
      }
      if (t.tipo === 'buy') {
        estoque[key].qty += t.qty;
        estoque[key].custoTotal += t.totalPrice;
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
    const currencyRatio = usdRate > 0 ? (selectedRate / usdRate) : 1;

    return Object.keys(estoque)
      .filter(key => estoque[key].qty > 0.0001)
      .map(key => {
        const item = estoque[key];
        let precoMedio = item.qty > 0 ? (item.custoTotal / item.qty) : 0;
        let cotacaoMediaFlowerUsd = item.custoTotal > 0 ? (item.custoTotalUsd / item.custoTotal) : usdRate;

        const customOverride = customAvgPrices[key] || customAvgPrices[item.nome.toLowerCase()];
        if (customOverride) {
          if (customOverride.avgSfl !== null && !isNaN(customOverride.avgSfl)) {
            precoMedio = Number(customOverride.avgSfl);
          }
          if (customOverride.flowerUsdRate !== null && !isNaN(customOverride.flowerUsdRate)) {
            cotacaoMediaFlowerUsd = Number(customOverride.flowerUsdRate);
          } else if (customOverride.avgUsd !== null && !isNaN(customOverride.avgUsd) && precoMedio > 0) {
            cotacaoMediaFlowerUsd = Number(customOverride.avgUsd) / precoMedio;
          }
        }

        const precoMedioUsd = precoMedio * cotacaoMediaFlowerUsd;
        const custoTotal = item.qty * precoMedio;
        const custoTotalUsd = custoTotal * cotacaoMediaFlowerUsd;

        const isNftItem = Boolean(item.isNft || (item.nome.toLowerCase() !== 'parsnip' && nftMarketData?.byName?.[item.nome]));
        let precoP2P = 0;

        if (isNftItem) {
          const nftEntry = nftMarketData?.byName?.[item.nome] || nftMarketData?.byName?.[item.nome.toLowerCase()];
          precoP2P = Number(nftEntry?.floor || 0);
        } else {
          precoP2P = marketData[item.nome] || marketData[Object.keys(marketData).find(k => k.toLowerCase() === item.nome.toLowerCase())] || 0;
        }

        const applicableTax = isNftItem ? 0.10 : effectiveTax;

        const precoVendaLiquidoUnitario = precoP2P * (1 - applicableTax);
        const valorVendaLiquidoTotal = item.qty * precoVendaLiquidoUnitario;
        
        const lucroAbsoluto = valorVendaLiquidoTotal - custoTotal;
        const lucroPercentual = custoTotal > 0 ? (lucroAbsoluto / custoTotal) * 100 : 0;

        const valorVendaLiquidoTotalUsd = valorVendaLiquidoTotal * usdRate;
        const lucroAbsolutoUsd = valorVendaLiquidoTotalUsd - custoTotalUsd;
        const lucroPercentualUsd = custoTotalUsd > 0 ? (lucroAbsolutoUsd / custoTotalUsd) * 100 : 0;

        const custoTotalMoeda = custoTotalUsd * currencyRatio;
        const valorVendaLiquidoTotalMoeda = valorVendaLiquidoTotal * selectedRate;
        const lucroAbsolutoMoeda = valorVendaLiquidoTotalMoeda - custoTotalMoeda;
        const lucroPercentualMoeda = custoTotalMoeda > 0 ? (lucroAbsolutoMoeda / custoTotalMoeda) * 100 : 0;

        const nftMeta = isNftItem
          ? (nftMarketData?.byName?.[item.nome] || nftMarketData?.byName?.[item.nome.toLowerCase()])
          : null;
        const boostText = item.boost_text || nftMeta?.boost_text || '';
        const nftId = item.nft_id || nftMeta?.id || null;
        const collection = item.collection || nftMeta?.collection || 'collectibles';
        const image = item.image || nftMeta?.image || (nftId
          ? (collection === 'wearables'
              ? `https://sunflower-land.com/play/wearables/images/${nftId}.png`
              : `https://sunflower-land.com/play/erc1155/images/${nftId}.webp`)
          : null);

        return {
          ...item,
          isNft: isNftItem,
          boost_text: boostText,
          nft_id: nftId,
          collection,
          image,
          precoMedio,
          precoMedioUsd,
          cotacaoMediaFlowerUsd,
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
  }, [transactions, currencyRates, selectedCurrency, customAvgPrices, marketData, nftMarketData, effectiveTax]);

  const handleTransaction = useCallback((nuevaTransacao) => {
    if (!nuevaTransacao) return;
    const cotacaoEntrada = nuevaTransacao.cotacao_entrada_usd ?? currencyRates.usd ?? 0.087;
    const totalPriceUsd = (nuevaTransacao.totalPrice || (nuevaTransacao.qty * nuevaTransacao.unitPrice)) * cotacaoEntrada;

    const txObj = {
      ...nuevaTransacao,
      cotacao_entrada_usd: cotacaoEntrada,
      token_price_usd_at_purchase: cotacaoEntrada,
      total_price_usd: totalPriceUsd,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };

    setTransactions(prev => {
      const updated = [...prev, txObj];
      try {
        localStorage.setItem('sfl_transactions', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (user) {
      setTimeout(() => {
        saveTransactionRemote(user.id, txObj);
      }, 100);
    }
  }, [currencyRates.usd, user, setTransactions]);

  return {
    user,
    setUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isSyncing,
    syncCloud,
    flowerPrice,
    flowerPriceUsd,
    effectiveTax,
    selectedIsland,
    setSelectedIsland: updateIsland,
    isVip,
    setIsVip: updateVip,
    isShrine,
    setIsShrine: updateShrine,
    currentLang,
    setCurrentLang,
    selectedCurrency,
    setSelectedCurrency: updateCurrency,
    marketData,
    nftMarketData,
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