import { supabase } from './supabase';

const TOKEN_CACHE_KEY = 'sfl_token_history_cache';
const RESOURCE_CACHE_KEY_PREFIX = 'sfl_res_history_cache_';
const DAILY_HISTORY_KEY = 'sfl_daily_history';
const HOURLY_HISTORY_KEY = 'sfl_hourly_history';
const LAST_SUPABASE_PUSH_KEY = 'sfl_last_supabase_history_push';
const CACHE_VERSION_KEY = 'sfl_history_cache_ver';
const CURRENT_CACHE_VERSION = 'v1.5.0_global_supabase';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de TTL para cache local
const SUPABASE_PUSH_THROTTLE_MS = 15 * 60 * 1000; // Envia no máximo a cada 15 minutos para não sobrecarregar

/**
 * 1. LIMPEZA AUTOMÁTICA DE CACHE LEGADO
 */
export function purgeLegacyMockCache() {
  try {
    const savedVer = localStorage.getItem(CACHE_VERSION_KEY);
    if (savedVer !== CURRENT_CACHE_VERSION) {
      console.log('[HistoryService] Atualizando estrutura de cache para histórico global Supabase...');
      
      localStorage.removeItem(TOKEN_CACHE_KEY);
      
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(RESOURCE_CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    }
  } catch (e) {
    console.warn('[HistoryService] Erro ao purgar cache legado:', e);
  }
}

// Executa limpeza de cache legado imediatamente ao importar
purgeLegacyMockCache();

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
 * 2. PERSISTÊNCIA REAL LOCAL E GLOBAL NO SUPABASE ('token_price_history' / 'resource_price_history')
 * Grava snapshot localmente e envia pontos globais para o Supabase.
 */
export function recordDailySnapshot(tokenPriceUsd = 0.05, marketData = {}) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');

    const hourKey = `${year}-${month}-${date} ${hours}:00`;
    const todayStr = `${year}-${month}-${date}`;
    const currentTokenUsd = Number(tokenPriceUsd || 0.05);

    const cleanResources = {};
    if (marketData && typeof marketData === 'object') {
      Object.entries(marketData).forEach(([key, val]) => {
        if (val !== undefined && val !== null && !isNaN(val)) {
          cleanResources[key] = Number(val);
        }
      });
    }

    // 1. Grava no localStorage local ('sfl_hourly_history')
    const rawHourly = localStorage.getItem(HOURLY_HISTORY_KEY);
    let hourlyHistory = rawHourly ? JSON.parse(rawHourly) : [];
    if (!Array.isArray(hourlyHistory)) hourlyHistory = [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    hourlyHistory = hourlyHistory.filter(h => (h.day || h.hourKey) >= cutoffStr);

    const existingHourlyIndex = hourlyHistory.findIndex(h => h.hourKey === hourKey);
    if (existingHourlyIndex >= 0) {
      hourlyHistory[existingHourlyIndex] = {
        ...hourlyHistory[existingHourlyIndex],
        timestamp: now.toISOString(),
        token_price_usd: currentTokenUsd,
        resources: {
          ...hourlyHistory[existingHourlyIndex].resources,
          ...cleanResources
        }
      };
    } else {
      hourlyHistory.push({
        hourKey,
        day: todayStr,
        timestamp: now.toISOString(),
        token_price_usd: currentTokenUsd,
        resources: cleanResources
      });
    }

    hourlyHistory.sort((a, b) => (a.hourKey || a.day).localeCompare(b.hourKey || b.day));
    localStorage.setItem(HOURLY_HISTORY_KEY, JSON.stringify(hourlyHistory));

    // 2. Transmite dados globais para o Supabase (com throttle para evitar exagero de requisições)
    const lastPush = Number(localStorage.getItem(LAST_SUPABASE_PUSH_KEY) || 0);
    const timeSinceLastPush = Date.now() - lastPush;

    if (timeSinceLastPush >= SUPABASE_PUSH_THROTTLE_MS && Object.keys(cleanResources).length > 0) {
      localStorage.setItem(LAST_SUPABASE_PUSH_KEY, String(Date.now()));
      
      // Envia cotação do token
      supabase
        .from('token_price_history')
        .insert([{ price_usd: currentTokenUsd, source: 'sfl.world' }])
        .then(({ error }) => {
          if (error) console.warn('[HistoryService] Erro ao gravar token_price_history global:', error.message || error);
        })
        .catch(err => console.warn('[HistoryService] Exceção ao gravar token_price_history global:', err?.message || err));

      // Envia cotações dos recursos
      const resourceRows = Object.entries(cleanResources).map(([resId, priceSfl]) => ({
        resource_id: resId,
        price_sfl: priceSfl,
        price_usd: priceSfl * currentTokenUsd,
        timestamp: now.toISOString()
      }));

      if (resourceRows.length > 0) {
        supabase
          .from('resource_price_history')
          .insert(resourceRows)
          .then(({ error }) => {
            if (error) {
              console.warn('[HistoryService] Erro ao enviar resource_price_history global:', error.message || error);
            } else {
              console.log(`[HistoryService] ${resourceRows.length} cotações globais enviadas ao Supabase!`);
            }
          })
          .catch(err => console.warn('[HistoryService] Exceção ao enviar resource_price_history global:', err?.message || err));
      }
    }

  } catch (e) {
    console.warn('[HistoryService] Erro ao gravar snapshot horário:', e);
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
 * Helper com timeout rápido para requisições ao Supabase (evita travamentos caso bloqueado por Brave Shields/Adblock)
 */
async function withTimeout(promise, timeoutMs = 2500) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Supabase request timeout')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Busca histórico da cotação do token $FLOWER (até 90 dias)
 */
export async function fetchTokenHistory(days = 90, currentPrice = 0.05) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const isoStartDate = startDate.toISOString();
  const dateCutoffStr = startDate.toISOString().split('T')[0];

  // 1. Tentar consulta no Supabase (Dados Globais)
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('token_price_history')
        .select('*')
        .gte('timestamp', isoStartDate)
        .order('timestamp', { ascending: true })
    );

    if (!error && Array.isArray(data) && data.length > 0) {
      setLocalCache(TOKEN_CACHE_KEY, data);
      return data;
    }
  } catch (err) {
    console.warn('[HistoryService] Supabase token_price_history indisponível:', err.message);
  }

  // 2. Tentar histórico acumulado local real ('sfl_hourly_history' / 'sfl_daily_history')
  try {
    const rawHourly = localStorage.getItem(HOURLY_HISTORY_KEY) || localStorage.getItem(DAILY_HISTORY_KEY);
    if (rawHourly) {
      const historyList = JSON.parse(rawHourly);
      if (Array.isArray(historyList) && historyList.length > 0) {
        const filtered = historyList.filter(h => (h.day || h.hourKey) >= dateCutoffStr && h.token_price_usd > 0);
        if (filtered.length > 0) {
          const points = filtered.map(h => ({
            id: h.hourKey || h.day,
            timestamp: h.timestamp,
            day: h.hourKey || h.day,
            price_usd: Number(h.token_price_usd),
            source: 'local_hourly_history',
            isInitialData: filtered.length <= 1
          }));
          return points;
        }
      }
    }
  } catch (e) {
    console.warn('[HistoryService] Erro ao ler sfl_hourly_history para token:', e);
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

  // 1. Tentar consulta na View Agregada v_resource_daily_metrics do Supabase (Globais)
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('v_resource_daily_metrics')
        .select('*')
        .eq('resource_id', resourceId)
        .gte('day', dateStr)
        .order('day', { ascending: true })
    );

    if (!error && Array.isArray(data) && data.length > 0) {
      setLocalCache(cacheKey, data);
      return data;
    }
  } catch (err) {
    console.warn(`[HistoryService] Supabase View v_resource_daily_metrics indisponível para ${resourceId}:`, err.message);
  }

  // 2. Tentar consulta na Tabela Bruta resource_price_history (Globais)
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('resource_price_history')
        .select('*')
        .eq('resource_id', resourceId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true })
    );

    if (!error && Array.isArray(data) && data.length > 0) {
      const formatted = data.map(d => ({
        resource_id: d.resource_id,
        day: d.timestamp ? d.timestamp.split('T')[0] : dateStr,
        timestamp: d.timestamp,
        avg_price_sfl: Number(d.price_sfl),
        price_sfl: Number(d.price_sfl),
        avg_price_usd: Number(d.price_usd)
      }));
      const withSma = calculateMovingAverage(formatted, 7, 'price_sfl');
      setLocalCache(cacheKey, withSma);
      return withSma;
    }
  } catch (err) {
    console.warn(`[HistoryService] Erro na Tabela resource_price_history para ${resourceId}:`, err.message);
  }

  // 3. Tentar histórico acumulado local real ('sfl_hourly_history' / 'sfl_daily_history')
  try {
    const rawHourly = localStorage.getItem(HOURLY_HISTORY_KEY) || localStorage.getItem(DAILY_HISTORY_KEY);
    if (rawHourly) {
      const historyList = JSON.parse(rawHourly);
      if (Array.isArray(historyList) && historyList.length > 0) {
        const filtered = historyList.filter(h => (h.day || h.hourKey) >= dateStr && h.resources && h.resources[resourceId] !== undefined);
        if (filtered.length > 0) {
          const rawPoints = filtered.map(h => {
            const pSfl = Number(h.resources[resourceId]);
            const pUsd = pSfl * (h.token_price_usd || 0.05);
            return {
              resource_id: resourceId,
              day: h.hourKey || h.day,
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
    console.warn(`[HistoryService] Erro ao ler sfl_hourly_history para recurso ${resourceId}:`, e);
  }

  // 4. Ponto único do preço real do dia atual
  return createInitialResourcePoint(resourceId, currentPriceSfl);
}
