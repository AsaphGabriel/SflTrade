import React, { useState } from 'react';
import useMarketData from './hooks/useMarketData';
import Header from './components/Header';
import PortfolioTable from './components/PortfolioTable';
import ResourceGrid from './components/ResourceGrid';
import TransactionModal from './components/TransactionModal';
import BottomNav from './components/BottomNav';
import FarmDashboard from './components/FarmDashboard';
import { t } from './i18n';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [modalResource, setModalResource] = useState('');
  
  const [farmId, setFarmId] = useState(localStorage.getItem('sfl_farm_id') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('sfl_api_key') || '');
  
  // Novo estado para controlar mensagens de erro e sucesso do perfil
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

  const {
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
    farmData,
    refreshData,
    handleTransaction,
    searchFarm,
    updatedTimeText,
    loading,
    error
  } = useMarketData();

  // A função com a VALIDAÇÃO BLINDADA da API Key
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

    // Se passou na validação, salva!
    localStorage.setItem('sfl_farm_id', farmId);
    localStorage.setItem('sfl_api_key', keyStr);
    
    setProfileMsg({ text: '✅ Salvo com sucesso!', type: 'success' });
    setTimeout(() => setProfileMsg({ text: '', type: '' }), 3000);
    
    if (farmId) searchFarm(farmId, keyStr, true);
  };

  const openBuy = (recurso = '') => {
    setModalResource(recurso);
    setIsBuyModalOpen(true);
  };

  const openSell = (recurso = '') => {
    setModalResource(recurso);
    setIsSellModalOpen(true);
  };

  if (loading && Object.keys(marketData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-amber-400 font-bold">
        <img src="https://sfl.world/img/source/Sunflower.png" alt="Loading" className="w-16 h-16 animate-pulse mb-4" />
        <p>Carregando...</p>
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
        />

        <main>
          {activeTab === 'home' && (
            <div className="space-y-6">
              <PortfolioTable 
                data={portfolioData} 
                currentLang={currentLang} 
                onOpenSell={openSell} 
              />
              <ResourceGrid 
                data={marketData} 
                currentLang={currentLang} 
                onOpenBuy={openBuy} 
                onOpenSell={openSell} 
              />
            </div>
          )}

          {activeTab === 'info' && (
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full shadow-lg">
              <h2 className="text-xl font-bold text-amber-400 border-b border-slate-700 pb-2">
                {t('infoTitle', currentLang)}
              </h2>
              <p className="text-slate-300"><strong>Versão:</strong> v1.0 (React Vite)</p>
              <p className="text-slate-300"><strong>Dev:</strong> Asaph Gabriel</p>
              <p className="text-slate-400 text-sm mt-4">{t('infoDataProvider', currentLang)}</p>
            </div>
          )}

          {(activeTab === 'perfil' || activeTab === 'profile') && (
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full space-y-4 shadow-lg">
              <h2 className="text-xl font-bold text-amber-400 border-b border-slate-700 pb-2">
                {t('profileTab', currentLang)}
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Farm ID</label>
                <input
                  type="text"
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  placeholder="Ex: 123456"
                  className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('apiKeyPlaceholder', currentLang)}
                  className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition"
              >
                {t('btnSave', currentLang)}
              </button>

              {/* Mensagem dinâmica renderizada aqui */}
              {profileMsg.text && (
                <p className={`text-sm font-bold text-center ${profileMsg.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {profileMsg.text}
                </p>
              )}

              <FarmDashboard farmData={farmData} currentLang={currentLang} />
            </div>
          )}
        </main>
      </div>

      <TransactionModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        type="buy"
        onSubmit={handleTransaction}
        effectiveTax={effectiveTax}
        marketData={marketData}
        portfolioData={portfolioData}
        currentLang={currentLang}
        initialResource={modalResource}
      />
      <TransactionModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        type="sell"
        onSubmit={handleTransaction}
        effectiveTax={effectiveTax}
        marketData={marketData}
        portfolioData={portfolioData}
        currentLang={currentLang}
        initialResource={modalResource}
      />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;