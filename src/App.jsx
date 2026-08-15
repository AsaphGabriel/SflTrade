import React, { useState } from 'react';
import useMarketData from './hooks/useMarketData';
import Header from './components/Header';
import PortfolioTable from './components/PortfolioTable';
import ResourceGrid from './components/ResourceGrid';
import TransactionModal from './components/TransactionModal';
import AuthModal from './components/AuthModal';
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
  
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

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
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full space-y-6 shadow-lg">
              <h2 className="text-xl font-bold text-amber-400 border-b border-slate-700 pb-2 flex items-center justify-between">
                <span>{t('profileTab', currentLang)}</span>
              </h2>

              {/* Card de Conta Supabase Cloud */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <span>☁️</span>
                    <span>{t('authTitle', currentLang)}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {user ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
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

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {user && (
                    <button
                      onClick={() => syncCloud(user, true)}
                      disabled={isSyncing}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1"
                    >
                      {isSyncing ? <span className="animate-spin">⌛</span> : <span>🔄 Sincronizar</span>}
                    </button>
                  )}
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 ${
                      user 
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600' 
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold'
                    }`}
                  >
                    {user ? (
                      <><span>⚙️</span> <span>{currentLang === 'pt' ? 'Gerenciar Conta' : 'Manage Account'}</span></>
                    ) : (
                      <><span>⚡</span> <span>{currentLang === 'pt' ? 'Entrar / Sincronizar' : 'Sign In / Sync'}</span></>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700/60 pb-1">
                  🔑 {currentLang === 'pt' ? 'Credenciais da Fazenda (API SFL)' : 'Farm API Credentials'}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Farm ID</label>
                  <input
                    type="text"
                    value={farmId}
                    onChange={(e) => setFarmId(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t('apiKeyPlaceholder', currentLang)}
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 text-sm"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition"
                >
                  {t('btnSave', currentLang)}
                </button>

                {profileMsg.text && (
                  <p className={`text-sm font-bold text-center ${profileMsg.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {profileMsg.text}
                  </p>
                )}
              </div>

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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        currentLang={currentLang}
        onAuthChange={(updatedUser) => setUser(updatedUser)}
        onSyncCloud={syncCloud}
        isSyncing={isSyncing}
      />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;