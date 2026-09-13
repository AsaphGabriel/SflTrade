import React, { useState } from 'react';
import useMarketData from './hooks/useMarketData';
import Header from './components/Header';
import PortfolioTable from './components/PortfolioTable';
import ResourceGrid from './components/ResourceGrid';
import TransactionModal from './components/TransactionModal';
import AuthModal from './components/AuthModal';
import BottomNav from './components/BottomNav';
import FarmDashboard from './components/FarmDashboard';
import MarketMoversCards from './components/MarketMoversCards';
import PriceChartModal from './components/PriceChartModal';
import { t } from './i18n';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [modalResource, setModalResource] = useState('');
  const [modalResourceMeta, setModalResourceMeta] = useState(null);
  const [selectedChartResource, setSelectedChartResource] = useState(null);
  
  const [farmId, setFarmId] = useState(localStorage.getItem('sfl_farm_id') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('sfl_api_key') || '');
  
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

  const [activeMoversCategory, setActiveMoversCategory] = useState('resources');
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState('all');
  const [marketSearchTerm, setMarketSearchTerm] = useState('');

  const handleMoversCategoryChange = (cat) => {
    setActiveMoversCategory(cat);
    // Ao clicar nos cards de maiores altas/baixas, navega para a categoria correspondente
    // na ResourceGrid, mas apenas se não houver uma busca ativa (para não interferir com o filtro de busca).
    if (!marketSearchTerm.trim()) {
      if (cat === 'power_ups') {
        setResourceCategoryFilter('power_ups');
      } else {
        setResourceCategoryFilter('all');
      }
    }
  };

  const handleResourceCategoryChange = (catId) => {
    setResourceCategoryFilter(catId);
    if (catId === 'power_ups') {
      setActiveMoversCategory('power_ups');
    } else {
      setActiveMoversCategory('resources');
    }
  };

  const {
    user,
    setUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isSyncing,
    syncCloud,
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
  } = useMarketData();

  const handleSaveProfile = () => {
    const keyStr = apiKey.trim();

    if (!keyStr) {
      setProfileMsg({ text: 'A API Key não pode estar vazia!', type: 'error' });
      setTimeout(() => setProfileMsg({ text: '', type: '' }), 3000);
      return;
    }

    if (!keyStr.startsWith('sfl.') || keyStr === 'sfl.') {
      setProfileMsg({ text: 'A API Key deve começar com "sfl." e conter o código completo!', type: 'error' });
      setTimeout(() => setProfileMsg({ text: '', type: '' }), 3000);
      return;
    }

    localStorage.setItem('sfl_farm_id', farmId);
    localStorage.setItem('sfl_api_key', keyStr);
    
    setProfileMsg({ text: '✅ Salvo com sucesso!', type: 'success' });
    setTimeout(() => setProfileMsg({ text: '', type: '' }), 3000);
    
    if (farmId) searchFarm(farmId, keyStr, true);
  };

  const openBuy = (recurso = '', meta = null) => {
    setModalResource(recurso);
    setModalResourceMeta(meta);
    setIsBuyModalOpen(true);
  };

  const openSell = (recurso = '', meta = null) => {
    setModalResource(recurso);
    setModalResourceMeta(meta);
    setIsSellModalOpen(true);
  };

  if (loading && Object.keys(marketData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-amber-400 font-bold">
        <span className="text-4xl animate-bounce mb-3">🌻</span>
        <p className="text-sm font-semibold">Carregando cotações...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans">
      {error && (
        <div className="bg-amber-500/10 border-b border-amber-500 text-amber-300 p-2 text-xs text-center">
          ⚠️ Modo Offline / Dados em Cache.
        </div>
      )}

      <div className="p-2 md:p-4 lg:p-6 max-w-7xl mx-auto">
        <Header
          flowerPrice={flowerPrice}
          effectiveTax={effectiveTax}
          selectedIsland={selectedIsland}
          onIslandChange={setSelectedIsland}
          isVip={isVip}
          onVipToggle={setIsVip}
          isShrine={isShrine}
          onShrineToggle={setIsShrine}
          currentLang={currentLang}
          onLangChange={setCurrentLang}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          onRefresh={refreshData}
          onOpenBuy={() => openBuy()}
          onOpenSell={() => openSell()}
          onSearchFarm={searchFarm}
          updatedTimeText={updatedTimeText}
          savedFarmId={farmId}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <main>
          {activeTab === 'home' && (
            <div className="space-y-6">
              <PortfolioTable 
                data={portfolioData}
                transactions={transactions}
                currentLang={currentLang} 
                selectedCurrency={selectedCurrency}
                onUpdateCustomAvgPrice={updateCustomAvgPrice}
                onOpenSell={openSell} 
              />
              <MarketMoversCards
                marketData={marketData}
                nftMarketData={nftMarketData}
                currentLang={currentLang}
                activeCategory={activeMoversCategory}
                onCategoryChange={handleMoversCategoryChange}
                onSelectResource={(res, meta) => setSelectedChartResource(meta ? { ...meta, name: meta.name || meta.resource || res, resource: meta.resource || meta.name || res } : res)}
              />
              <ResourceGrid 
                data={marketData} 
                nftData={nftMarketData}
                currentLang={currentLang} 
                categoryFilter={resourceCategoryFilter}
                onCategoryFilterChange={handleResourceCategoryChange}
                searchTerm={marketSearchTerm}
                onSearchTermChange={setMarketSearchTerm}
                onOpenBuy={openBuy} 
                onOpenSell={openSell} 
              />
            </div>
          )}

          {activeTab === 'info' && (
            <FarmDashboard
              mode="info"
              farmData={farmData}
              marketData={marketData}
              nftMarketData={nftMarketData}
              flowerPrice={flowerPrice}
              selectedCurrency={selectedCurrency}
              currentLang={currentLang}
              farmId={farmId}
              apiKey={apiKey}
              setFarmId={setFarmId}
              setApiKey={setApiKey}
              onSaveProfile={handleSaveProfile}
              profileMsg={profileMsg}
              searchFarm={searchFarm}
              user={user}
              syncCloud={syncCloud}
              isSyncing={isSyncing}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onNavigateTab={setActiveTab}
            />
          )}

          {(activeTab === 'perfil' || activeTab === 'profile') && (
            <FarmDashboard
              mode="perfil"
              farmData={farmData}
              marketData={marketData}
              nftMarketData={nftMarketData}
              flowerPrice={flowerPrice}
              selectedCurrency={selectedCurrency}
              currentLang={currentLang}
              farmId={farmId}
              apiKey={apiKey}
              setFarmId={setFarmId}
              setApiKey={setApiKey}
              onSaveProfile={handleSaveProfile}
              profileMsg={profileMsg}
              searchFarm={searchFarm}
              user={user}
              syncCloud={syncCloud}
              isSyncing={isSyncing}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onNavigateTab={setActiveTab}
            />
          )}
        </main>
      </div>

      {isBuyModalOpen && (
        <TransactionModal
          isOpen={true}
          onClose={() => { setIsBuyModalOpen(false); setModalResourceMeta(null); }}
          type="buy"
          onSubmit={handleTransaction}
          effectiveTax={effectiveTax}
          marketData={marketData}
          nftMarketData={nftMarketData}
          portfolioData={portfolioData}
          currentLang={currentLang}
          initialResource={modalResource}
          initialResourceMeta={modalResourceMeta}
        />
      )}
      {isSellModalOpen && (
        <TransactionModal
          isOpen={true}
          onClose={() => { setIsSellModalOpen(false); setModalResourceMeta(null); }}
          type="sell"
          onSubmit={handleTransaction}
          effectiveTax={effectiveTax}
          marketData={marketData}
          nftMarketData={nftMarketData}
          portfolioData={portfolioData}
          currentLang={currentLang}
          initialResource={modalResource}
          initialResourceMeta={modalResourceMeta}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={true}
          onClose={() => setIsAuthModalOpen(false)}
          user={user}
          currentLang={currentLang}
          onAuthChange={(updatedUser) => setUser(updatedUser)}
          onSyncCloud={syncCloud}
          isSyncing={isSyncing}
        />
      )}

      {selectedChartResource && (
        <PriceChartModal
          resourceId={selectedChartResource}
          flowerPriceUsd={flowerPrice}
          currentLang={currentLang}
          onClose={() => setSelectedChartResource(null)}
        />
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;