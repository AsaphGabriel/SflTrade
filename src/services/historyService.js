import { supabase } from './supabase';

const TOKEN_CACHE_KEY = 'sfl_token_history_cache';
const RESOURCE_CACHE_KEY_PREFIX = 'sfl_res_history_cache_';
const DAILY_HISTORY_KEY = 'sfl_daily_history';
const CACHE_VERSION_KEY = 'sfl_history_cache_ver';
const CURRENT_CACHE_VERSION = 'v1.3.0_real_only';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de TTL para cache de requisições ao Supabase

/**
 * 1. LIMPEZA AUTOMÁTICA DE CACHE LEGADO (MOCK PURGE)
 * Remove qualquer chave de histórico antiga contendo dados simulados/senoidais do localStorage.
 */
export function purgeLegacyMockCache() {
  try {
    const savedVer = localStorage.getItem(CACHE_VERSION_KEY);
    if (savedVer !== CURRENT_CACHE_VERSION) {
      console.log('[HistoryService] Purgando cache legado de dados simulados/senoidais...');
      
      // Remove chaves legadas específicas
      localStorage.removeItem(TOKEN_CACHE_KEY);
      
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(RESOURCE_CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      
      // Atualiza versão do cache
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    }
  } catch (e) {
    console.warn('[HistoryService] Erro ao purgar cache legado:', e);
  }
}

// Executa limpeza de cache legado imediatamente ao importar o módulo
purgeLegacyMockCache();

/**
 * Utilitários de Cache no localStorage
 */
function getLocalCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - parsed.timestamp;
    return {
      data: parsed.data,
      isExpired: age > CACHE_TTL_MS
    };
  } catch (e) {
    console.warn(`[HistoryService] Erro ao ler cache local '${key}':`, e);
    return null;
  }
}

function setLocalCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    console.warn(`[HistoryService] Erro ao salvar cache local '${key}':`, e);
  }
}

/**
 * Utilitário para calcular média móvel (Simple Moving Average - SMA)
 */
export function calculateMovingAverage(data = [], windowSize = 7, valueKey = 'price_sfl') {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  return data.map((item, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const subset = data.slice(start, index + 1);
    const sum = subset.reduce((acc, curr) => acc + (Number(curr[valueKey] || curr.price || 0)), 0);
    const avg = subset.length > 0 ? sum / subset.length : 0;
    
    return {
      ...item,
      [`sma_${windowSize}d`]: Number(avg.toFixed(6))
    };
  });
}

/**
 * 2. PERSISTÊNCIA REAL LOCAL ('sfl_daily_history')
 * Grava snapshot diário real dos preços de mercado no localStorage sem duplicatas no mesmo dia.
 */
export function recordDailySnapshot(tokenPriceUsd = 0.05, marketData = {}) {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const raw = localStorage.getItem(DAILY_HISTORY_KEY);
    let history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(history)) history = [];

    // Limpa entradas com mais de 90 dias
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    history = history.filter(h => h.day >= cutoffStr);

    // Formata recursos reais sem valores padrão arbitrários
    const cleanResources = {};
    if (marketData && typeof marketData === 'object') {
      Object.entries(marketData).forEach(([key, val]) => {
        if (val !== undefined && val !== null && !isNaN(val)) {
          cleanResources[key] = Number(val);
        }
      });
    }

    const existingIndex = history.findIndex(h => h.day === todayStr);
    const currentTokenUsd = Number(tokenPriceUsd || 0.05);

    if (existingIndex >= 0) {
      // Atualiza o registro do dia atual com os últimos preços reais
      history[existingIndex] = {
        ...history[existingIndex],
        timestamp: now.toISOString(),
        token_price_usd: currentTokenUsd,
        resources: {
          ...history[existingIndex].resources,
          ...cleanResources
        }
      };
    } else {
      // Adiciona novo snapshot diário
      history.push({
        day: todayStr,
        timestamp: now.toISOString(),
        token_price_usd: currentTokenUsd,
        resources: cleanResources
      });
    }

    // Ordena por data ascendente
    history.sort((a, b) => a.day.localeCompare(b.day));
    localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('[HistoryService] Erro ao gravar snapshot diário em sfl_daily_history:', e);
  }
}

/**
 * Retorna ponto inicial do dia atual com o preço real quando não há histórico acumulado no Supabase
 */
function createInitialTokenPoint(currentPrice = 0.05) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  return [{
    id: `real_today`,
    timestamp: now.toISOString(),
    day: todayStr,
    price_usd: Number(currentPrice || 0.05),
    source: 'realtime',
    isInitialData: true
  }];
}

function createInitialResourcePoint(resourceId, currentPriceSfl = 0) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const price = Number(currentPriceSfl || 0);
  return [{
    resource_id: resourceId,
    day: todayStr,
    timestamp: now.toISOString(),
    avg_price_sfl: price,
    price_sfl: price,
    min_price_sfl: price,
    max_price_sfl: price,
    avg_price_usd: price * 0.05,
    records_count: 1,
    isInitialData: true
  }];
}

/**
 * Busca histórico da cotação do token $FLOWER (até 90 dias)
 */
export async function fetchTokenHistory(days = 90, currentPrice = 0.05) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const isoStartDate = startDate.toISOString();
  const dateCutoffStr = startDate.toISOString().split('T')[0];

  // 1. Tentar consulta no Supabase
  try {
    const { data, error } = await supabase
      .from('token_price_history')
      .select('*')
      .gte('timestamp', isoStartDate)
      .order('timestamp', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      setLocalCache(TOKEN_CACHE_KEY, data);
      return data;
    }
  } catch (err) {
    console.warn('[HistoryService] Falha ao consultar Supabase token_price_history:', err.message);
  }

  // 2. Tentar histórico acumulado local real ('sfl_daily_history')
  try {
    const rawDaily = localStorage.getItem(DAILY_HISTORY_KEY);
    if (rawDaily) {
      const dailyHistory = JSON.parse(rawDaily);
      if (Array.isArray(dailyHistory) && dailyHistory.length > 0) {
        const filtered = dailyHistory.filter(h => h.day >= dateCutoffStr && h.token_price_usd > 0);
        if (filtered.length > 0) {
          const points = filtered.map(h => ({
            id: h.day,
            timestamp: h.timestamp,
            day: h.day,
            price_usd: Number(h.token_price_usd),
            source: 'local_daily_history',
            isInitialData: filtered.length <= 1
          }));
          return points;
        }
      }
    }
  } catch (e) {
    console.warn('[HistoryService] Erro ao ler sfl_daily_history para token:', e);
  }

  // 3. Ponto único do preço real do dia atual
  return createInitialTokenPoint(currentPrice);
}

/**
 * Busca histórico de preços de um recurso (até 90 dias)
 */
export async function fetchResourceHistory(resourceId, days = 90, currentPriceSfl = 0) {
  if (!resourceId) return [];

  const cacheKey = RESOURCE_CACHE_KEY_PREFIX + resourceId.toLowerCase();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];

  // 1. Tentar consulta na View Agregada v_resource_daily_metrics do Supabase
  try {
    const { data, error } = await supabase
      .from('v_resource_daily_metrics')
      .select('*')
      .eq('resource_id', resourceId)
      .gte('day', dateStr)
      .order('day', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      setLocalCache(cacheKey, data);
      return data;
    }
  } catch (err) {
    console.warn(`[HistoryService] Erro na View v_resource_daily_metrics para ${resourceId}:`, err.message);
  }

  // 2. Tentar consulta na Tabela Bruta resource_price_history
  try {
    const { data, error } = await supabase
      .from('resource_price_history')
      .select('*')
      .eq('resource_id', resourceId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const withSma = calculateMovingAverage(data, 7, 'price_sfl');
      setLocalCache(cacheKey, withSma);
      return withSma;
    }
  } catch (err) {
    console.warn(`[HistoryService] Erro na Tabela resource_price_history para ${resourceId}:`, err.message);
  }

  // 3. Tentar histórico acumulado local real ('sfl_daily_history')
  try {
    const rawDaily = localStorage.getItem(DAILY_HISTORY_KEY);
    if (rawDaily) {
      const dailyHistory = JSON.parse(rawDaily);
      if (Array.isArray(dailyHistory) && dailyHistory.length > 0) {
        const filtered = dailyHistory.filter(h => h.day >= dateStr && h.resources && h.resources[resourceId] !== undefined);
        if (filtered.length > 0) {
          const rawPoints = filtered.map(h => {
            const pSfl = Number(h.resources[resourceId]);
            const pUsd = pSfl * (h.token_price_usd || 0.05);
            return {
              resource_id: resourceId,
              day: h.day,
              timestamp: h.timestamp,
              avg_price_sfl: pSfl,
              price_sfl: pSfl,
              min_price_sfl: pSfl,
              max_price_sfl: pSfl,
              avg_price_usd: pUsd,
              records_count: 1,
              isInitialData: filtered.length <= 1
            };
          });

          // Calcula médias móveis para o histórico real acumulado localmente
          const withSma7 = calculateMovingAverage(rawPoints, 7, 'avg_price_sfl');
          const withSma30 = calculateMovingAverage(withSma7, 30, 'avg_price_sfl');

          return withSma30.map(item => ({
            ...item,
            sma_7d_sfl: item.sma_7d,
            sma_30d_sfl: item.sma_30d
          }));
        }
      }
    }
  } catch (e) {
    console.warn(`[HistoryService] Erro ao ler sfl_daily_history para recurso ${resourceId}:`, e);
  }

  // 4. Ponto único do preço real do dia atual
  return createInitialResourcePoint(resourceId, currentPriceSfl);
}
