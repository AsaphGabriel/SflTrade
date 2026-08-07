import React from 'react';
import { t } from '../i18n';

const StatBox = ({ label, value }) => (
  <div className="bg-slate-900 rounded-lg p-3 border border-slate-700/50 flex flex-col justify-center items-center text-center">
    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
    <span className="text-sm font-bold text-amber-400 mt-1">{value}</span>
  </div>
);

const FarmDashboard = ({ farmData, currentLang }) => {
  if (!farmData) return null;

  const { land, bumpkin, source, isFromCache } = farmData;

  const formatNumber = (num) => {
    if (!num && num !== 0) return '-';
    return Number(num).toLocaleString(currentLang === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 2 });
  };

  const isOfficial = source === 'official';
  const hasInventory = land?.inventory && Object.keys(land.inventory).length > 0;

  return (
    <div className="mt-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700 pb-2 gap-2">
        <h3 className="text-lg font-bold text-amber-500">
          {t('farmDataTitle', currentLang)}
        </h3>

        {/* Indicador Transparente da Fonte de Dados (Oficial vs Pública vs Cache) */}
        <div className="flex items-center gap-2 text-xs">
          {isOfficial ? (
            <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
              🔐 {t('dataSourceOfficial', currentLang)}
            </span>
          ) : (
            <span className="bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-bold border border-blue-500/30 flex items-center gap-1">
              🌐 {t('dataSourcePublic', currentLang)}
            </span>
          )}

          {isFromCache && (
            <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-bold border border-amber-500/30 flex items-center gap-1">
              ⚡ {t('dataSourceCache', currentLang)}
            </span>
          )}
        </div>
      </div>

      {/* Land Info Section */}
      {land && (
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 shadow-md">
          <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            🏝️ {t('landInfo', currentLang)} - {land.type ? land.type.charAt(0).toUpperCase() + land.type.slice(1) : 'Unknown'}
          </h4>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            <StatBox label={t('level', currentLang)} value={land.level} />
            <StatBox label={t('coins', currentLang)} value={formatNumber(land.coins)} />
            <StatBox label={t('balance', currentLang)} value={formatNumber(land.balance)} />
            <StatBox label={t('gem', currentLang)} value={formatNumber(land.gem)} />
            <StatBox label={t('marks', currentLang)} value={formatNumber(land.marks)} />
            <StatBox label={t('charm', currentLang)} value={land.charm || 0} />
            <StatBox label={t('cheer', currentLang)} value={land.cheer || 0} />
            <StatBox label={t('taxResource', currentLang)} value={`${((land.taxResource || 0) * 100).toFixed(1)}%`} />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {land.verified && (
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-semibold border border-emerald-500/30">
                ✅ {t('verified', currentLang)}
              </span>
            )}
            {land.vip && (
              <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full font-semibold border border-purple-500/30">
                👑 VIP {land.vip_info?.exp_text ? `(${land.vip_info.exp_text})` : ''}
              </span>
            )}
            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-semibold border border-blue-500/30">
              👥 Refs: {land.referrals?.totalReferrals || 0}
            </span>
          </div>

          {/* Inventário Oficial se disponível */}
          {hasInventory && (
            <div className="mt-4 border-t border-slate-700/60 pt-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                📦 {t('officialInventory', currentLang)}
              </span>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
                {Object.entries(land.inventory)
                  .filter(([_, qty]) => Number(qty) > 0)
                  .slice(0, 16)
                  .map(([item, qty]) => (
                    <span key={item} className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 font-mono">
                      <span className="font-semibold">{item}:</span>
                      <span className="text-amber-400 font-bold">{formatNumber(qty)}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bumpkin Info Section */}
      {bumpkin && (
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 shadow-md">
          <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            🧑‍🌾 {t('bumpkinInfo', currentLang)}
          </h4>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatBox label={t('level', currentLang)} value={bumpkin.level} />
            <StatBox label={t('experience', currentLang)} value={formatNumber(bumpkin.experience)} />
          </div>

          {bumpkin.skills && Object.keys(bumpkin.skills).length > 0 && (
            <div className="mt-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                {t('activeSkills', currentLang)} ({Object.keys(bumpkin.skills).length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
                {Object.keys(bumpkin.skills).map((skill, index) => (
                  <span key={index} className="bg-slate-900 text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmDashboard;

