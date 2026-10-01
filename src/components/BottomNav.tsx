import React from 'react';

const BottomNav = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-xs z-50 bg-slate-800/90 backdrop-blur-md border border-slate-700/60 rounded-full py-2 px-4 shadow-2xl flex justify-around items-center">
      <button 
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center transition ${activeTab === 'home' ? 'text-amber-400' : 'text-slate-400'}`}
        aria-label="Home"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-[10px]">Home</span>
      </button>
      
      <button 
        onClick={() => onTabChange('info')}
        className={`flex flex-col items-center transition ${activeTab === 'info' ? 'text-amber-400' : 'text-slate-400'}`}
        aria-label="Info"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>
        <span className="text-[10px]">Info</span>
      </button>
      
      <button 
        onClick={() => onTabChange('perfil')}
        className={`flex flex-col items-center transition ${activeTab === 'perfil' ? 'text-amber-400' : 'text-slate-400'}`}
        aria-label="Profile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-[10px]">Perfil</span>
      </button>
    </nav>
  );
};

export default BottomNav;