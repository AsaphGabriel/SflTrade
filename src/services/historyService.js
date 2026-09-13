import { supabase } from './supabase';

const TOKEN_CACHE_KEY = 'sfl_token_history_cache';
const RESOURCE_CACHE_KEY_PREFIX = 'sfl_res_history_cache_';
const DAILY_HISTORY_KEY = 'sfl_daily_history';
const HOURLY_HISTORY_KEY = 'sfl_hourly_history';
const LAST_SUPABASE_PUSH_KEY = 'sfl_last_supabase_history_push';
const LAST_SUPABASE_NFT_PUSH_KEY = 'sfl_last_supabase_nft_push';
const CACHE_VERSION_KEY = 'sfl_history_cache_ver';
const CURRENT_CACHE_VERSION = 'v1.5.0_global_supabase';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de TTL para cache local
const SUPABASE_PUSH_THROTTLE_MS = 15 * 60 * 1000; // Envia no máximo a cada 15 minutos para não sobrecarregar
const SUPABASE_NFT_PUSH_THROTTLE_MS = 4 * 60 * 60 * 1000; // 4 horas de throttle para NFTs (preserva quota gratuita)
const NFT_HOURLY_HISTORY_KEY = 'sfl_nft_hourly_history';

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
 * Utilitário linear O(N) para calcular média móvel (Simple Moving Average - SMA) sem travamentos de CPU
 */
export function calculateMovingAverage(data = [], windowSize = 7, valueKey = 'price_sfl') {
  if (!Array.isArray(data) || data.length === 0) return [];
  const safeWindow = Math.max(1, windowSize);
  const result = [];
  let runningSum = 0;

  for (let i = 0; i < data.length; i++) {
    const val = Number(data[i][valueKey] || data[i].price || 0) || 0;
    runningSum += val;
    if (i >= safeWindow) {
      const oldVal = Number(data[i - safeWindow][valueKey] || data[i - safeWindow].price || 0) || 0;
      runningSum -= oldVal;
    }
    const count = Math.min(i + 1, safeWindow);
    const avg = count > 0 ? runningSum / count : 0;
    result.push({
      ...data[i],
      [`sma_${windowSize}d`]: Number(avg.toFixed(6))
    });
  }
  return result;
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
 * Utilitário de agregação de séries temporais para amostragem exata por filtro:
 * - 24h: 24 pontos (1 a cada 1 hora)
 * - 7D:  14 pontos (1 a cada 12 horas)
 * - 30D: 30 pontos (1 a cada 1 dia)
 * - 90D: 30 pontos (1 a cada 3 dias = 90 dias total)
 */
export function aggregateHistoryByInterval(rawData = [], timeframe = '30D', fallbackPrice = 0) {
  let tfStr = String(timeframe).toUpperCase();
  if (timeframe === 1) tfStr = '24H';
  if (timeframe === 7) tfStr = '7D';
  if (timeframe === 30) tfStr = '30D';
  if (timeframe === 90) tfStr = '90D';

  let numBuckets = 30;
  let stepMs = 24 * 60 * 60 * 1000;

  if (tfStr === '24H' || tfStr === '24') {
    numBuckets = 24;
    stepMs = 60 * 60 * 1000; // 1 hora
  } else if (tfStr === '7D' || tfStr === '7') {
    numBuckets = 14;
    stepMs = 12 * 60 * 60 * 1000; // 12 horas
  } else if (tfStr === '30D' || tfStr === '30') {
    numBuckets = 30;
    stepMs = 24 * 60 * 60 * 1000; // 24 horas
  } else if (tfStr === '90D' || tfStr === '90') {
    numBuckets = 30;
    stepMs = 3 * 24 * 60 * 60 * 1000; // 3 dias (72 horas) para 90 dias em 30 resultados
  }

  const nowMs = Date.now();
  const sortedRaw = Array.isArray(rawData)
    ? [...rawData]
      .map(item => {
        const t = new Date(item.timestamp || item.day || 0).getTime();
        const p = Number(item.floor_sfl ?? item.avg_floor_sfl ?? item.price_sfl ?? item.avg_price_sfl ?? item.price_usd ?? item.price ?? 0);
        return { ...item, t, p };
      })
      .filter(item => !isNaN(item.t) && item.t > 0 && !isNaN(item.p) && item.p > 0)
      .sort((a, b) => a.t - b.t)
    : [];

  const buckets = [];

  for (let i = 0; i < numBuckets; i++) {
    const bucketStartMs = nowMs - (numBuckets - i) * stepMs;
    const bucketEndMs = nowMs - (numBuckets - i - 1) * stepMs;
    const bucketMidMs = (bucketStartMs + bucketEndMs) / 2;
    const bucketEndDate = new Date(bucketEndMs);

    // Filtra pontos da série bruta dentro da janela do bucket
    const matches = sortedRaw.filter(item => item.t >= bucketStartMs && item.t < bucketEndMs);

    let avgVal = 0;
    let isFallback = false;

    if (matches.length > 0) {
      const sum = matches.reduce((acc, curr) => acc + curr.p, 0);
      avgVal = sum / matches.length;
    } else if (sortedRaw.length > 0) {
      // Interpolação entre o ponto anterior mais próximo e o ponto posterior mais próximo
      let prec = null;
      let succ = null;

      for (const item of sortedRaw) {
        if (item.t < bucketMidMs) {
          prec = item;
        } else if (item.t > bucketMidMs && !succ) {
          succ = item;
          break;
        }
      }

      if (prec && succ) {
        const ratio = (bucketMidMs - prec.t) / (succ.t - prec.t);
        avgVal = prec.p + ratio * (succ.p - prec.p);
      } else if (prec) {
        avgVal = prec.p;
      } else if (succ) {
        avgVal = succ.p;
      } else {
        avgVal = Number(fallbackPrice || 0);
      }
      isFallback = true;
    } else {
      avgVal = Number(fallbackPrice || 0);
      isFallback = true;
    }

    // Formatação do rótulo de data/hora
    let labelDateStr = bucketEndDate.toISOString().split('T')[0];
    if (numBuckets === 24 && stepMs === 3600000) {
      const hours = String(bucketEndDate.getHours()).padStart(2, '0');
      const mins = String(bucketEndDate.getMinutes()).padStart(2, '0');
      labelDateStr = `${hours}:${mins}`;
    } else {
      const m = String(bucketEndDate.getMonth() + 1).padStart(2, '0');
      const d = String(bucketEndDate.getDate()).padStart(2, '0');
      labelDateStr = `${m}-${d}`;
    }

    buckets.push({
      id: `b_${i}_${bucketEndMs}`,
      timestamp: bucketEndDate.toISOString(),
      day: labelDateStr,
      avg_price_sfl: Number(avgVal.toFixed(6)),
      price_sfl: Number(avgVal.toFixed(6)),
      price_usd: Number(avgVal.toFixed(6)),
      isInitialData: isFallback
    });
  }

  // Calcula Médias Móveis SMA 7d e SMA 30d
  const withSma7 = calculateMovingAverage(buckets, 7, 'price_sfl');
  const withSma30 = calculateMovingAverage(withSma7, 30, 'price_sfl');

  return withSma30.map(item => ({
    ...item,
    sma_7d_sfl: item.sma_7d,
    sma_30d_sfl: item.sma_30d
  }));
}

/**
 * Busca histórico da cotação do token $FLOWER por amostragem exata de período (24h, 7D, 30D, 90D)
 */
export async function fetchTokenHistory(timeframe = '30D', currentPrice = 0.05) {
  let days = 30;
  const tfStr = String(timeframe).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days - 1);
  const isoStartDate = startDate.toISOString();

  let rawPoints = [];

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
      rawPoints = data;
    }
  } catch (err) {
    console.warn('[HistoryService] Supabase token_price_history indisponível:', err.message);
  }

  // 2. Fallback local acumulado ('sfl_hourly_history' / 'sfl_daily_history')
  if (rawPoints.length === 0) {
    try {
      const rawHourly = localStorage.getItem(HOURLY_HISTORY_KEY) || localStorage.getItem(DAILY_HISTORY_KEY);
      if (rawHourly) {
        const historyList = JSON.parse(rawHourly);
        if (Array.isArray(historyList) && historyList.length > 0) {
          rawPoints = historyList.map(h => ({
            timestamp: h.timestamp || h.day,
            price_usd: Number(h.token_price_usd)
          })).filter(h => h.price_usd > 0);
        }
      }
    } catch (e) {
      console.warn('[HistoryService] Erro ao ler sfl_hourly_history para token:', e);
    }
  }

  return aggregateHistoryByInterval(rawPoints, timeframe, currentPrice);
}

/**
 * Busca histórico de preços de um recurso por amostragem exata de período (24h, 7D, 30D, 90D)
 */
export async function fetchResourceHistory(resourceId, timeframe = '30D', currentPriceSfl = 0) {
  if (!resourceId) return [];

  let days = 30;
  const tfStr = String(timeframe).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days - 1);
  const dateStr = startDate.toISOString().split('T')[0];

  let rawPoints = [];

  // Se timeframe for 24h ou 7D, prioriza a tabela bruta resource_price_history com timestamps precisos
  if (days <= 7) {
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
        rawPoints = data.map(d => ({
          timestamp: d.timestamp,
          price_sfl: Number(d.price_sfl),
          price_usd: Number(d.price_usd)
        }));
      }
    } catch (err) {
      console.warn(`[HistoryService] Erro na tabela resource_price_history para ${resourceId}:`, err.message);
    }
  }

  // Se não encontrou dados brutos ou timeframe for 30D/90D, busca na View agregada v_resource_daily_metrics
  if (rawPoints.length === 0) {
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
        rawPoints = data.map(d => ({
          timestamp: d.day,
          price_sfl: Number(d.avg_price_sfl),
          price_usd: Number(d.avg_price_usd)
        }));
      }
    } catch (err) {
      console.warn(`[HistoryService] Supabase View v_resource_daily_metrics indisponível para ${resourceId}:`, err.message);
    }
  }

  // Fallback local ('sfl_hourly_history' / 'sfl_daily_history')
  if (rawPoints.length === 0) {
    try {
      const rawHourly = localStorage.getItem(HOURLY_HISTORY_KEY) || localStorage.getItem(DAILY_HISTORY_KEY);
      if (rawHourly) {
        const historyList = JSON.parse(rawHourly);
        if (Array.isArray(historyList) && historyList.length > 0) {
          rawPoints = historyList
            .filter(h => h.resources && h.resources[resourceId] !== undefined)
            .map(h => {
              const pSfl = Number(h.resources[resourceId]);
              return {
                timestamp: h.timestamp || h.day,
                price_sfl: pSfl,
                price_usd: pSfl * (h.token_price_usd || 0.05)
              };
            });
        }
      }
    } catch (e) {
      console.warn(`[HistoryService] Erro ao ler sfl_hourly_history para recurso ${resourceId}:`, e);
    }
  }

  return aggregateHistoryByInterval(rawPoints, timeframe, currentPriceSfl);
}

/**
 * 5. DESTAQUES DO MERCADO: TOP 3 MAIORES ALTAS E TOP 3 MAIORES BAIXAS
 * Otimizado para usar a cotação real instantânea e comparar com a referência histórica exata do período.
 */
const BASELINE_CACHE_TTL_MS = 3 * 60 * 1000; // Cache de 3 min apenas para a consulta de baseline no Supabase
const baselineCache = {};

export async function fetchMarketMovers(currentMarketData = {}, timeframe = '24h') {
  const tfStr = String(timeframe).toUpperCase();
  let safeTimeframe = '24h';
  let hoursBack = 24;
  let minAgeMs = 12 * 60 * 60 * 1000; // Mínimo de 12h de idade para ser considerado baseline de 24h

  if (tfStr === '7D' || tfStr === '7') {
    safeTimeframe = '7D';
    hoursBack = 7 * 24;
    minAgeMs = 3.5 * 24 * 60 * 60 * 1000;
  } else if (tfStr === '30D' || tfStr === '30') {
    safeTimeframe = '30D';
    hoursBack = 30 * 24;
    minAgeMs = 15 * 24 * 60 * 60 * 1000;
  } else if (tfStr === '90D' || tfStr === '90') {
    safeTimeframe = '90D';
    hoursBack = 90 * 24;
    minAgeMs = 45 * 24 * 60 * 60 * 1000;
  }

  const nowMs = Date.now();
  const targetTimeMs = nowMs - hoursBack * 60 * 60 * 1000;

  // 1. Reutiliza ou busca mapa de baseline histórica (somente a consulta do banco é armazenada em cache)
  let baselineMap = {};
  const cachedBaseline = baselineCache[safeTimeframe];
  if (cachedBaseline && (nowMs - cachedBaseline.timestamp < BASELINE_CACHE_TTL_MS)) {
    baselineMap = cachedBaseline.map;
  } else {
    try {
      if (hoursBack <= 168) {
        // Para 24h e 7D, busca registros históricos na tabela de snapshots com limite temporal de 24h atrás
        const { data: rawHistory, error: rawError } = await withTimeout(
          supabase
            .from('resource_price_history')
            .select('resource_id, price_sfl, timestamp')
            .gte('timestamp', new Date(targetTimeMs - 24 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: true })
            .limit(3000),
          3000
        );

        if (!rawError && Array.isArray(rawHistory) && rawHistory.length > 0) {
          const byRes = {};
          rawHistory.forEach(r => {
            if (!byRes[r.resource_id]) byRes[r.resource_id] = [];
            byRes[r.resource_id].push(r);
          });

          Object.entries(byRes).forEach(([resId, rows]) => {
            let closest = rows[0];
            let minDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTimeMs);
            for (const row of rows) {
              const diff = Math.abs(new Date(row.timestamp).getTime() - targetTimeMs);
              if (diff < minDiff) {
                minDiff = diff;
                closest = row;
              }
            }
            const closestAge = nowMs - new Date(closest.timestamp).getTime();
            if (closest && closest.price_sfl > 0 && closestAge >= minAgeMs) {
              baselineMap[resId] = Number(closest.price_sfl);
            }
          });
        }
      } else {
        // Para 30D e 90D, busca na View agregada v_resource_daily_metrics
        const targetDateStr = new Date(targetTimeMs).toISOString().split('T')[0];
        const { data: dailyMetrics, error: dailyError } = await withTimeout(
          supabase
            .from('v_resource_daily_metrics')
            .select('resource_id, day, avg_price_sfl')
            .order('day', { ascending: true }),
          3000
        );

        if (!dailyError && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
          const byRes = {};
          dailyMetrics.forEach(r => {
            if (!byRes[r.resource_id]) byRes[r.resource_id] = [];
            byRes[r.resource_id].push(r);
          });

          Object.entries(byRes).forEach(([resId, rows]) => {
            const pastRows = rows.filter(r => r.day <= targetDateStr);
            if (pastRows.length > 0) {
              baselineMap[resId] = Number(pastRows[pastRows.length - 1].avg_price_sfl);
            }
          });
        }
      }
    } catch (err) {
      console.warn(`[HistoryService] Supabase indisponível para movers (${safeTimeframe}):`, err?.message || err);
    }

    // Fallback local caso Supabase não tenha retornado baselines
    if (Object.keys(baselineMap).length === 0) {
      try {
        const rawHourly = localStorage.getItem(HOURLY_HISTORY_KEY) || localStorage.getItem(DAILY_HISTORY_KEY);
        if (rawHourly) {
          const historyList = JSON.parse(rawHourly);
          if (Array.isArray(historyList) && historyList.length > 0) {
            const sorted = [...historyList].sort((a, b) =>
              (new Date(a.timestamp || a.day).getTime()) - (new Date(b.timestamp || b.day).getTime())
            );

            let bestSnapshot = sorted[0];
            let minDiff = Math.abs(new Date(bestSnapshot.timestamp || bestSnapshot.day).getTime() - targetTimeMs);

            for (const snap of sorted) {
              const snapTime = new Date(snap.timestamp || snap.day).getTime();
              const diff = Math.abs(snapTime - targetTimeMs);
              if (diff < minDiff) {
                minDiff = diff;
                bestSnapshot = snap;
              }
            }

            const bestAge = nowMs - new Date(bestSnapshot.timestamp || bestSnapshot.day).getTime();
            if (bestSnapshot && bestSnapshot.resources && bestAge >= minAgeMs) {
              Object.entries(bestSnapshot.resources).forEach(([resId, price]) => {
                if (Number(price) > 0) {
                  baselineMap[resId] = Number(price);
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn('[HistoryService] Erro ao carregar baseline local para movers:', e);
      }
    }

    baselineCache[safeTimeframe] = {
      timestamp: nowMs,
      map: baselineMap
    };
  }

  // 2. Calcula as variações percentuais usando a cotação real AO VIVO enviada em currentMarketData
  const variations = [];

  Object.entries(currentMarketData).forEach(([resourceId, rawCurrent]) => {
    const currentPrice = Number(rawCurrent);
    if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) return;

    // Se houver baseline histórica válida de períodos anteriores, calcula a variação real
    const basePrice = Number(baselineMap[resourceId] || currentPrice);

    if (basePrice > 0) {
      const diff = currentPrice - basePrice;
      const changePct = (diff / basePrice) * 100;

      if (isFinite(changePct) && !isNaN(changePct)) {
        variations.push({
          resource: resourceId,
          name: resourceId,
          currentPrice,
          basePrice,
          diff,
          changePct: Number(changePct.toFixed(2))
        });
      }
    }
  });

  // Ordena por maior variação positiva
  variations.sort((a, b) => b.changePct - a.changePct);

  // Top 3 que mais valorizaram (apenas os que tiveram variação real)
  const topGainers = variations.filter(v => v.changePct > 0).slice(0, 3);

  // Top 3 que mais desvalorizaram (apenas os que tiveram variação negativa real)
  const topLosers = [...variations].filter(v => v.changePct < 0).reverse().slice(0, 3);

  return {
    timeframe: safeTimeframe,
    topGainers: topGainers.length > 0 ? topGainers : variations.slice(0, 3),
    topLosers: topLosers.length > 0 ? topLosers : [...variations].reverse().slice(0, 3),
    hasData: variations.length > 0
  };
}

/**
 * ====================================================================
 * HISTÓRICO E MOVERS DE NFTS (POWER UPS)
 * ====================================================================
 */

/**
 * Grava snapshots locais de NFTs e transmite para a tabela nft_price_history no Supabase
 * com throttle de 4 horas para não sobrecarregar e preservar a quota gratuita.
 */
export function recordNftSnapshot(tokenPriceUsd = 0.05, nftList = []) {
  if (!Array.isArray(nftList) || nftList.length === 0) return;

  try {
    const now = new Date();
    const currentTokenUsd = Number(tokenPriceUsd || 0.05);

    // 1. Grava no cache local (último snapshot)
    const localSnapshot = {
      timestamp: now.toISOString(),
      tokenPriceUsd: currentTokenUsd,
      items: nftList.map(n => ({
        id: n.id,
        name: n.name,
        collection: n.collection || 'collectibles',
        floor: Number(n.floor || 0),
        lastSalePrice: Number(n.lastSalePrice || 0),
        supply: n.supply || 0,
        boost_text: n.boost_text || ''
      }))
    };
    setLocalCache('sfl_last_nft_snapshot', localSnapshot);

    // 2. Transmissão para o Supabase com throttle de 4 horas
    const lastPush = Number(localStorage.getItem(LAST_SUPABASE_NFT_PUSH_KEY) || 0);
    const timeSinceLastPush = Date.now() - lastPush;

    if (timeSinceLastPush >= SUPABASE_NFT_PUSH_THROTTLE_MS) {
      localStorage.setItem(LAST_SUPABASE_NFT_PUSH_KEY, String(Date.now()));

      const rows = nftList.map(n => ({
        nft_id: n.id,
        name: n.name,
        collection: n.collection || 'collectibles',
        floor_sfl: Number(n.floor || 0),
        floor_usd: Number(n.floor || 0) * currentTokenUsd,
        last_sale_sfl: n.lastSalePrice !== undefined && n.lastSalePrice !== null ? Number(n.lastSalePrice) : null,
        supply: n.supply || null,
        boost_text: n.boost_text || null,
        timestamp: now.toISOString()
      }));

      if (rows.length > 0) {
        supabase
          .from('nft_price_history')
          .insert(rows)
          .then(({ error }) => {
            if (error) {
              console.warn('[HistoryService] Erro ao gravar nft_price_history no Supabase:', error.message || error);
            } else {
              console.log(`[HistoryService] ${rows.length} snapshots de NFTs gravados com sucesso no Supabase!`);
            }
          })
          .catch(err => console.warn('[HistoryService] Exceção ao gravar nft_price_history:', err?.message || err));
      }
    }
  } catch (e) {
    console.warn('[HistoryService] Falha ao registrar snapshot de NFTs:', e);
  }
}

/**
 * Busca histórico de Floor Price de um NFT específico no Supabase (com fallback local)
 */
export async function fetchNftHistory(nftId, timeframe = '30D', currentFloorSfl = 0) {
  if (nftId === undefined || nftId === null) return [];

  let days = 30;
  const tfStr = String(timeframe).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days - 1);
  const dateStr = startDate.toISOString().split('T')[0];

  let rawPoints = [];

  // Se timeframe for 24h ou 7D, prioriza tabela bruta nft_price_history
  if (days <= 7) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('nft_price_history')
          .select('*')
          .eq('nft_id', Number(nftId))
          .gte('timestamp', startDate.toISOString())
          .order('timestamp', { ascending: true })
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map(d => ({
          timestamp: d.timestamp,
          floor_sfl: Number(d.floor_sfl),
          price_sfl: Number(d.floor_sfl),
          floor_usd: Number(d.floor_usd),
          price_usd: Number(d.floor_usd),
          last_sale_sfl: d.last_sale_sfl ? Number(d.last_sale_sfl) : null
        }));
      }
    } catch (err) {
      console.warn(`[HistoryService] Erro ao consultar nft_price_history para NFT #${nftId}:`, err?.message || err);
    }
  }

  // Se não encontrou ou timeframe for 30D/90D, busca na View agregada v_nft_daily_metrics
  if (rawPoints.length === 0) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('v_nft_daily_metrics')
          .select('*')
          .eq('nft_id', Number(nftId))
          .gte('day', dateStr)
          .order('day', { ascending: true })
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map(d => ({
          timestamp: d.day,
          floor_sfl: Number(d.avg_floor_sfl),
          price_sfl: Number(d.avg_floor_sfl),
          floor_usd: Number(d.avg_floor_usd),
          price_usd: Number(d.avg_floor_usd),
          min_price_sfl: Number(d.min_floor_sfl),
          max_price_sfl: Number(d.max_floor_sfl),
          sma_7d_sfl: d.sma_7d_sfl ? Number(d.sma_7d_sfl) : null,
          sma_30d_sfl: d.sma_30d_sfl ? Number(d.sma_30d_sfl) : null
        }));
      }
    } catch (err) {
      console.warn(`[HistoryService] Erro ao consultar v_nft_daily_metrics para NFT #${nftId}:`, err?.message || err);
    }
  }

  // Fallback caso não haja dados históricos: gera ponto inicial
  if (rawPoints.length === 0) {
    const now = new Date();
    const price = Number(currentFloorSfl || 0);
    rawPoints = [{
      timestamp: now.toISOString(),
      day: now.toISOString().split('T')[0],
      floor_sfl: price,
      price_sfl: price,
      floor_usd: price * 0.05,
      price_usd: price * 0.05,
      isInitialData: true
    }];
  }

  const aggregated = aggregateHistoryByInterval(rawPoints, timeframe, currentFloorSfl);
  const withSma7 = calculateMovingAverage(aggregated, 7, 'price_sfl');
  return calculateMovingAverage(withSma7, 30, 'price_sfl');
}

/**
 * Cache em memória para os baselines de variação de NFTs por período
 */
const nftBaselineCache = {
  '24h': null,
  '7D': null,
  '30D': null,
  '90D': null
};

/**
 * Calcula os Destaques de Mercado (Maiores Altas e Maiores Baixas) para NFTs baseado no Floor Price
 */
export async function fetchNftMarketMovers(nftMarketList = [], timeframe = '24h') {
  const safeTimeframe = ['24h', '7D', '30D', '90D'].includes(timeframe) ? timeframe : '24h';
  const nowMs = Date.now();

  const timeframeConfig = {
    '24h': { targetDays: 1, minAgeHours: 2, cacheTtlMs: 15 * 60 * 1000 },
    '7D':  { targetDays: 7, minAgeHours: 24, cacheTtlMs: 30 * 60 * 1000 },
    '30D': { targetDays: 30, minAgeHours: 72, cacheTtlMs: 60 * 60 * 1000 },
    '90D': { targetDays: 90, minAgeHours: 168, cacheTtlMs: 60 * 60 * 1000 }
  };

  const { targetDays, minAgeHours, cacheTtlMs } = timeframeConfig[safeTimeframe];
  const targetTimeMs = nowMs - (targetDays * 24 * 60 * 60 * 1000);

  let baselineMap = {};
  const cached = nftBaselineCache[safeTimeframe];

  if (cached && (nowMs - cached.timestamp < cacheTtlMs) && cached.map && Object.keys(cached.map).length > 0) {
    baselineMap = cached.map;
  } else {
    try {
      if (safeTimeframe === '24h') {
        const targetDate = new Date(targetTimeMs);
        const windowStart = new Date(targetDate.getTime() - (8 * 60 * 60 * 1000)).toISOString();
        const windowEnd = new Date(targetDate.getTime() + (8 * 60 * 60 * 1000)).toISOString();

        const { data, error } = await withTimeout(
          supabase
            .from('nft_price_history')
            .select('nft_id, name, floor_sfl, timestamp')
            .gte('timestamp', windowStart)
            .lte('timestamp', windowEnd)
            .order('timestamp', { ascending: false })
            .limit(1000)
        );

        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach(item => {
            const key = item.name || String(item.nft_id);
            if (!baselineMap[key] && Number(item.floor_sfl) > 0) {
              baselineMap[key] = Number(item.floor_sfl);
            }
          });
        }
      } else {
        const windowStartStr = new Date(targetTimeMs - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const windowEndStr = new Date(targetTimeMs + (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

        const { data, error } = await withTimeout(
          supabase
            .from('v_nft_daily_metrics')
            .select('nft_id, name, avg_floor_sfl, day')
            .gte('day', windowStartStr)
            .lte('day', windowEndStr)
            .order('day', { ascending: false })
            .limit(1000)
        );

        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach(item => {
            const key = item.name || String(item.nft_id);
            if (!baselineMap[key] && Number(item.avg_floor_sfl) > 0) {
              baselineMap[key] = Number(item.avg_floor_sfl);
            }
          });
        }
      }
    } catch (err) {
      console.warn(`[HistoryService] Supabase indisponível para movers de NFT (${safeTimeframe}):`, err?.message || err);
    }

    nftBaselineCache[safeTimeframe] = {
      timestamp: nowMs,
      map: baselineMap
    };
  }

  // Calcula variações percentuais baseadas no Floor Price
  const variations = [];
  const safeList = Array.isArray(nftMarketList) ? nftMarketList : [];

  safeList.forEach(nft => {
    const currentFloor = Number(nft.floor);
    if (!currentFloor || isNaN(currentFloor) || currentFloor <= 0) return;

    const key = nft.name || String(nft.id);
    const baseFloor = Number(baselineMap[key] || currentFloor);

    if (baseFloor > 0) {
      const diff = currentFloor - baseFloor;
      const changePct = (diff / baseFloor) * 100;

      if (isFinite(changePct) && !isNaN(changePct)) {
        variations.push({
          resource: nft.name,
          nft_id: nft.id,
          name: nft.name,
          collection: nft.collection,
          image: nft.image || (nft.collection === 'wearables'
            ? `https://sunflower-land.com/play/wearables/images/${nft.id}.png`
            : `https://sunflower-land.com/play/erc1155/images/${nft.id}.webp`),
          boost_text: nft.boost_text,
          currentPrice: currentFloor,
          basePrice: baseFloor,
          diff,
          changePct: Number(changePct.toFixed(2)),
          isNft: true
        });
      }
    }
  });

  variations.sort((a, b) => b.changePct - a.changePct);

  const topGainers = variations.filter(v => v.changePct > 0).slice(0, 3);
  const topLosers = [...variations].filter(v => v.changePct < 0).reverse().slice(0, 3);

  return {
    timeframe: safeTimeframe,
    topGainers: topGainers.length > 0 ? topGainers : variations.slice(0, 3),
    topLosers: topLosers.length > 0 ? topLosers : [...variations].reverse().slice(0, 3),
    hasData: variations.length > 0
  };
}


