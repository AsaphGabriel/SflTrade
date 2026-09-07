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
          const p = Number(item.price_sfl ?? item.avg_price_sfl ?? item.price_usd ?? item.price ?? 0);
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
 * Calcula variação percentual dos recursos em relação ao registro de referência (24h atrás, 7D atrás, 30D atrás, 90D atrás).
 */
const MOVERS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos
const moversCache = {};

export async function fetchMarketMovers(currentMarketData = {}, timeframe = '24h') {
  const tfStr = String(timeframe).toUpperCase();
  let safeTimeframe = '24h';
  let hoursBack = 24;

  if (tfStr === '7D' || tfStr === '7') {
    safeTimeframe = '7D';
    hoursBack = 7 * 24;
  } else if (tfStr === '30D' || tfStr === '30') {
    safeTimeframe = '30D';
    hoursBack = 30 * 24;
  } else if (tfStr === '90D' || tfStr === '90') {
    safeTimeframe = '90D';
    hoursBack = 90 * 24;
  }

  const nowMs = Date.now();
  const cached = moversCache[safeTimeframe];
  if (cached && (Date.now() - cached.timestamp < MOVERS_CACHE_TTL_MS)) {
    return cached.data;
  }

  const targetTimeMs = nowMs - hoursBack * 60 * 60 * 1000;

  const baselineMap = {};

  // 1. Consulta no Supabase
  try {
    if (hoursBack <= 168) {
      // Para 24h e 7D, busca registros mais próximos do instante targetTimeMs
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
          if (closest && closest.price_sfl > 0) {
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
          } else if (rows.length > 0) {
            baselineMap[resId] = Number(rows[0].avg_price_sfl);
          }
        });
      }
    }
  } catch (err) {
    console.warn(`[HistoryService] Supabase indisponível para movers (${safeTimeframe}):`, err?.message || err);
  }

  // 2. Fallback local (localStorage)
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

          if (bestSnapshot && bestSnapshot.resources) {
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

  // 3. Calcula variações percentuais para cada recurso
  const variations = [];

  Object.entries(currentMarketData).forEach(([resourceId, rawCurrent]) => {
    const currentPrice = Number(rawCurrent);
    const basePrice = Number(baselineMap[resourceId]);

    if (currentPrice > 0 && basePrice > 0) {
      const diff = currentPrice - basePrice;
      const changePct = (diff / basePrice) * 100;

      if (isFinite(changePct) && !isNaN(changePct)) {
        variations.push({
          resource: resourceId,
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

  // Top 3 que mais valorizaram
  const topGainers = variations.slice(0, 3);

  // Top 3 que mais desvalorizaram
  const topLosers = [...variations].reverse().slice(0, 3);

  const result = {
    timeframe: safeTimeframe,
    topGainers,
    topLosers,
    hasData: variations.length > 0
  };

  moversCache[safeTimeframe] = {
    timestamp: Date.now(),
    data: result
  };

  return result;
}


