
import type { Database } from '../types/database.types';

export type TokenPriceHistory = Database['public']['Tables']['token_price_history']['Row'];
export type ResourcePriceHistory = Database['public']['Tables']['resource_price_history']['Row'];
export type NftPriceHistory = Database['public']['Tables']['nft_price_history']['Row'];

export interface MarketDataRecord {
  [key: string]: number;
}

export interface NftItem {
  id: number;
  name: string;
  collection?: string;
  floor: number;
  lastSalePrice?: number;
  supply?: number;
  boost_text?: string;
  displayName?: string;
  image?: string;
}

export interface HistoryPoint {
  id?: string;
  resource_id?: string;
  timestamp?: string;
  day?: string;
  price_sfl?: number;
  price_usd?: number;
  avg_price_sfl?: number;
  avg_price_usd?: number;
  min_price_sfl?: number;
  max_price_sfl?: number;
  records_count?: number;
  floor_sfl?: number;
  floor_usd?: number;
  avg_floor_sfl?: number;
  avg_floor_usd?: number;
  min_floor_sfl?: number;
  max_floor_sfl?: number;
  last_sale_sfl?: number | null;
  sma_7d_sfl?: number | null;
  sma_30d_sfl?: number | null;
  isInitialData?: boolean;
  t?: number;
  p?: number;
  price?: number;
  sma_7d?: number;
  sma_30d?: number;
  resources?: Record<string, number>;
  hourKey?: string;
  token_price_usd?: number;
}
import { supabase } from './supabase';
import { computeChangePct, rankMovers, getTargetTimestamp, getActualTimeframeLabel, MoverItem, MarketMoversResult } from '../utils/marketMath';

const TOKEN_CACHE_KEY = 'sfl_token_history_cache';
const RESOURCE_CACHE_KEY_PREFIX = 'sfl_res_history_cache_';
const DAILY_HISTORY_KEY = 'sfl_daily_history';
const HOURLY_HISTORY_KEY = 'sfl_hourly_history';
// const LAST_SUPABASE_PUSH_KEY = 'sfl_last_supabase_history_push';
// const LAST_SUPABASE_NFT_PUSH_KEY = 'sfl_last_supabase_nft_push';
const CACHE_VERSION_KEY = 'sfl_history_cache_ver';
const CURRENT_CACHE_VERSION = 'v1.5.0_global_supabase';

// const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de TTL para cache local
// const SUPABASE_PUSH_THROTTLE_MS = 15 * 60 * 1000; // Envia no máximo a cada 15 minutos para não sobrecarregar
// const SUPABASE_NFT_PUSH_THROTTLE_MS = 60 * 60 * 1000; // 1 hora de throttle para NFTs
// const NFT_HOURLY_HISTORY_KEY = 'sfl_nft_hourly_history';

/**
 * 1. LIMPEZA AUTOMÁTICA DE CACHE LEGADO
 */
export function purgeLegacyMockCache() {
  try {
    const savedVer = localStorage.getItem(CACHE_VERSION_KEY);
    if (savedVer !== CURRENT_CACHE_VERSION) {
      console.log('[HistoryService] Atualizando estrutura de cache para histórico global Supabase...');

      localStorage.removeItem(TOKEN_CACHE_KEY);

      let keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(RESOURCE_CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k: string) => localStorage.removeItem(k));

      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    }
  } catch (e: unknown) {
    console.warn('[HistoryService] Erro ao purgar cache legado:', e);
  }
}

// Executa limpeza de cache legado imediatamente ao importar
purgeLegacyMockCache();

function setLocalCache(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e: unknown) {
    console.warn(`[HistoryService] Erro ao salvar cache local '${key}':`, e);
  }
}

function getLocalCache(key: string) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item);
  } catch (e: unknown) {
    console.warn(`[HistoryService] Erro ao ler cache local '${key}':`, e);
    return null;
  }
}

/**
 * Utilitário linear O(N) para calcular média móvel (Simple Moving Average - SMA) sem travamentos de CPU
 */
export function calculateMovingAverage(data: Record<string, any> = [], windowSize: number = 7, valueKey: string = 'price_sfl') {
  if (!Array.isArray(data) || data.length === 0) return [];
  const safeWindow = Math.max(1, windowSize);
  let result: any[] = [];
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
export function recordDailySnapshot(tokenPriceUsd: number = 0.05, marketData: Record<string, number> = {}) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');

    const hourKey = `${year}-${month}-${date} ${hours}:00`;
    const todayStr = `${year}-${month}-${date}`;
    const currentTokenUsd = Number(tokenPriceUsd || 0.05);

    const cleanResources: Record<string, number> = {};
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
    hourlyHistory = hourlyHistory.filter((h: Record<string, any>) => (h.day || h.hourKey) >= cutoffStr);

    const existingHourlyIndex = hourlyHistory.findIndex((h: Record<string, any>) => h.hourKey === hourKey);
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

    hourlyHistory.sort((a: Record<string, any>, b: Record<string, any>) => (a.hourKey || a.day).localeCompare(b.hourKey || b.day));

    // Downsampling: mantém todas as horas dos últimos 7 dias; para dias anteriores (até 90 dias), mantém apenas 1 amostra diária
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const seenDays = new Set();
    hourlyHistory = hourlyHistory.filter((h: Record<string, any>) => {
      const hDay = h.day || (h.hourKey ? h.hourKey.split(' ')[0] : null);
      if (hDay && hDay >= sevenDaysAgo) return true; // Mantém todas as horas dos últimos 7 dias
      if (hDay && seenDays.has(hDay)) return false; // Remove horas intermediárias de dias antigos
      if (hDay) seenDays.add(hDay);
      return true; // Preserva 1 amostra diária
    });

    localStorage.setItem(HOURLY_HISTORY_KEY, JSON.stringify(hourlyHistory));

    // 2. Transmite dados globais para o Supabase (DESATIVADO - ARCH-01)
    // A gravação global agora é responsabilidade exclusiva de Edge Functions ou Cron Jobs (service_role)
    // para evitar exposição de RLS e erros 42501 no console do cliente.

  } catch (e: unknown) {
    console.warn('[HistoryService] Erro ao gravar snapshot horário:', e);
  }
}

/**
 * Retorna ponto inicial do dia atual com o preço real quando não há histórico acumulado no Supabase
 */
export function createInitialTokenPoint(currentPrice: number = 0.05) {
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

export function createInitialResourcePoint(resourceId: string | number, currentPriceSfl: number = 0) {
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
async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number = 2500): Promise<T> {
  let timeoutId;
  const timeoutPromise = new Promise<T>((_: any, reject: any) => {
    timeoutId = setTimeout(() => reject(new Error('Supabase request timeout')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise as any]) as T;
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
export function aggregateHistoryByInterval(rawData: any[] = [], timeframe: string | number = '30D', fallbackPrice: number = 0) {
  let tfStr = String(timeframe as any).toUpperCase();
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
      .map((item: Record<string, any>) => {
        const t = new Date(item.timestamp || item.day || 0).getTime();
        const p = Number(item.floor_sfl ?? item.avg_floor_sfl ?? item.price_sfl ?? item.avg_price_sfl ?? item.price_usd ?? item.price ?? 0);
        return { ...item, t, p };
      })
      .filter((item: Record<string, any>) => !isNaN(item.t) && item.t > 0 && !isNaN(item.p) && item.p > 0)
      .sort((a: Record<string, any>, b: Record<string, any>) => a.t - b.t)
    : [];

  let buckets: any[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const bucketStartMs = nowMs - (numBuckets - i) * stepMs;
    const bucketEndMs = nowMs - (numBuckets - i - 1) * stepMs;
    const bucketMidMs = (bucketStartMs + bucketEndMs) / 2;
    const bucketEndDate = new Date(bucketEndMs);

    // Filtra pontos da série bruta dentro da janela do bucket
    const matches = sortedRaw.filter((item: Record<string, any>) => item.t >= bucketStartMs && item.t < bucketEndMs);

    let avgVal = 0;
    let isFallback = false;

    if (matches.length > 0) {
      const sum = matches.reduce((acc: number, curr: any) => acc + curr.p, 0);
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

  return withSma30.map((item: Record<string, any>) => ({
    ...item,
    sma_7d_sfl: item.sma_7d,
    sma_30d_sfl: item.sma_30d
  }));
}

/**
 * Busca histórico da cotação do token $FLOWER por amostragem exata de período (24h, 7D, 30D, 90D)
 */
export async function fetchTokenHistory(timeframe: string | number = '30D', currentPrice: number = 0.05) {
  let days = 30;
  const tfStr = String(timeframe as any).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const isoStartDate = startDate.toISOString();

  let rawPoints: { timestamp?: string; day?: string; floor_sfl?: number; price_sfl?: number; floor_usd?: number; price_usd?: number; isInitialData?: boolean; t?: number; p?: number; volume?: number; [key: string]: unknown }[] = []; // timestamp?: string; day?: string; floor_sfl?: number; price_sfl?: number; floor_usd?: number; price_usd?: number; isInitialData?: boolean; t?: number; p?: number; volume?: number; [key: string]: unknown }[] = [];

  // 1. Tentar consulta no Supabase (Dados Globais)
  try {
    const { data, error } = await withTimeout<any>(
      supabase
        .from('token_price_history')
        .select('*')
        .gte('timestamp', isoStartDate)
        .order('timestamp', { ascending: true })
    );

    if (!error && Array.isArray(data) && data.length > 0) {
      rawPoints = data;
    }
  } catch (err: unknown) {
    console.warn('[HistoryService] Supabase token_price_history indisponível:', (err as Error).message);
  }

  // 2. Fallback local acumulado ('sfl_hourly_history' / 'sfl_daily_history')
  if (rawPoints.length === 0) {
    try {
      const rawHourly = localStorage.getItem(HOURLY_HISTORY_KEY) || localStorage.getItem(DAILY_HISTORY_KEY);
      if (rawHourly) {
        const historyList = JSON.parse(rawHourly);
        if (Array.isArray(historyList) && historyList.length > 0) {
          rawPoints = historyList.map((h: Record<string, any>) => ({
            timestamp: h.timestamp || h.day,
            price_usd: Number(h.token_price_usd)
          })).filter((h: Record<string, any>) => h.price_usd > 0);
        }
      }
    } catch (e: unknown) {
      console.warn('[HistoryService] Erro ao ler sfl_hourly_history para token:', e);
    }
  }

  return aggregateHistoryByInterval(rawPoints, timeframe, currentPrice);
}

/**
 * Busca histórico de preços de um recurso por amostragem exata de período (24h, 7D, 30D, 90D)
 */
export async function fetchResourceHistory(resourceId: string | number, timeframe: string | number = '30D', currentPriceSfl: number = 0) {
  if (!resourceId) return [];

  let days = 30;
  const tfStr = String(timeframe as any).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];

  let rawPoints: { timestamp?: string; day?: string; floor_sfl?: number; price_sfl?: number; floor_usd?: number; price_usd?: number; isInitialData?: boolean; t?: number; p?: number; volume?: number; [key: string]: unknown }[] = []; // timestamp?: string; day?: string; floor_sfl?: number; price_sfl?: number; floor_usd?: number; price_usd?: number; isInitialData?: boolean; t?: number; p?: number; volume?: number; [key: string]: unknown }[] = [];

  // Se timeframe for 24h ou 7D, prioriza a tabela bruta resource_price_history com timestamps precisos
  if (days <= 7) {
    try {
      const { data, error } = await withTimeout<any>(
        supabase
          .from('resource_price_history')
          .select('*')
          .eq('resource_id', resourceId as string)
          .gte('timestamp', startDate.toISOString())
          .order('timestamp', { ascending: true })
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map((d: any) => ({
          timestamp: d.timestamp,
          price_sfl: Number(d.price_sfl),
          price_usd: Number(d.price_usd)
        }));
      }
    } catch (err: unknown) {
      console.warn(`[HistoryService] Erro na tabela resource_price_history para ${resourceId}:`, (err as Error).message);
    }
  }

  // Se não encontrou dados brutos ou timeframe for 30D/90D, busca na View agregada v_resource_daily_metrics
  if (rawPoints.length === 0) {
    try {
      const { data, error } = await withTimeout<any>(
        supabase
          .from('v_resource_daily_metrics')
          .select('*')
          .eq('resource_id', resourceId as string)
          .gte('day', dateStr)
          .order('day', { ascending: true })
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map((d: any) => ({
          timestamp: d.day,
          price_sfl: Number(d.avg_price_sfl),
          price_usd: Number(d.avg_price_usd)
        }));
      }
    } catch (err: unknown) {
      console.warn(`[HistoryService] Supabase View v_resource_daily_metrics indisponível para ${resourceId}:`, (err as Error).message);
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
            .filter((h: Record<string, any>) => h.resources && h.resources[resourceId] !== undefined)
            .map((h: Record<string, any>) => {
              const pSfl = Number((h.resources as any)[resourceId]);
              return {
                timestamp: h.timestamp || h.day,
                price_sfl: pSfl,
                price_usd: (pSfl as number) * ((h.token_price_usd as number) || 0.05)
              };
            });
        }
      }
    } catch (e: unknown) {
      console.warn(`[HistoryService] Erro ao ler sfl_hourly_history para recurso ${resourceId}:`, e);
    }
  }

  return aggregateHistoryByInterval(rawPoints, timeframe, currentPriceSfl);
}

/**
 * 5. DESTAQUES DO MERCADO: TOP 3 MAIORES ALTAS E TOP 3 MAIORES BAIXAS
 * Otimizado para usar a cotação real instantânea e comparar com a referência histórica exata do período.
 */

export async function fetchMarketMovers(currentMarketData: Record<string, number> = {}, timeframe: '24h' | '7D' | '30D' | '90D' = '24h'): Promise<MarketMoversResult> {
  const targetTimeMs = getTargetTimestamp(timeframe);
  const nowMs = Date.now();
  
  
  let baselineMap: Record<string, number> = {};
  let oldestFoundMs = nowMs;

  try {
    if (timeframe === '24h' || timeframe === '7D') {
      const windowStart = new Date(targetTimeMs - 4 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(targetTimeMs + 4 * 60 * 60 * 1000).toISOString();
      
      const { data: rawHistory, error: rawError } = await supabase
        .from('resource_price_history')
        .select('resource_id, price_sfl, timestamp')
        .gte('timestamp', windowStart)
        .lte('timestamp', windowEnd)
        .order('timestamp', { ascending: true })
        .limit(3000);

      if (!rawError && Array.isArray(rawHistory) && rawHistory.length > 0) {
        const byRes: Record<string, typeof rawHistory> = {};
        rawHistory.forEach((r) => {
          if (!byRes[r.resource_id]) byRes[r.resource_id] = [];
          byRes[r.resource_id].push(r);
        });

        Object.entries(byRes).forEach(([resId, rows]) => {
          const futureRows = rows.filter(r => new Date(r.timestamp).getTime() >= targetTimeMs);
          if (futureRows.length > 0) {
            const closest = futureRows[0];
            const closestAge = nowMs - new Date(closest.timestamp).getTime();
            if (closest.price_sfl > 0) {
              baselineMap[resId] = Number(closest.price_sfl);
              if (closestAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - closestAge;
            }
          }
        });
      }
    } else {
      const targetDay = new Date(targetTimeMs).toISOString().split('T')[0];
      const startDay = new Date(targetTimeMs - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDay = new Date(targetTimeMs + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: dailyMetrics, error: dailyError } = await supabase
        .from('v_resource_daily_metrics')
        .select('resource_id, day, avg_price_sfl')
        .gte('day', startDay)
        .lte('day', endDay)
        .order('day', { ascending: true });

      if (!dailyError && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
        const byRes: Record<string, typeof dailyMetrics> = {};
        dailyMetrics.forEach((r) => {
          const resId = r.resource_id || '';
          if (!byRes[resId]) byRes[resId] = [];
          byRes[resId].push(r);
        });

        Object.entries(byRes).forEach(([resId, rows]) => {
          const futureRows = rows.filter(r => (r.day || '') >= targetDay);
          if (futureRows.length > 0) {
            const closest = futureRows[0];
            baselineMap[resId] = Number(closest.avg_price_sfl);
            const rowAge = nowMs - new Date(closest.day!).getTime();
            if (rowAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - rowAge;
          }
        });
      }
    }
  } catch (err: unknown) {
    console.warn(`[HistoryService] Supabase indisponível para movers (${timeframe}):`, err);
  }

  const items: MoverItem[] = [];
  
  Object.entries(currentMarketData).forEach(([resourceId, currentPrice]) => {
    if (!currentPrice || currentPrice <= 0) return;
    const basePrice = baselineMap[resourceId];
    if (basePrice && basePrice > 0) {
      const changePct = computeChangePct(currentPrice, basePrice);
      if (changePct !== null) {
        items.push({
          name: resourceId,
          currentPriceSfl: currentPrice,
          basePriceSfl: basePrice,
          changePct,
          isNft: false
        });
      }
    }
  });

  const ranked = rankMovers(items);
  const actualAgeMs = nowMs - oldestFoundMs;
  ranked.actualTimeframeLabel = getActualTimeframeLabel(timeframe, actualAgeMs);
  
  return ranked;
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
export function recordNftSnapshot(tokenPriceUsd: number = 0.05, nftList: NftItem[] = []) {
  if (!Array.isArray(nftList) || nftList.length === 0) return;

  try {
    const now = new Date();
    const currentTokenUsd = Number(tokenPriceUsd || 0.05);

    // 1. Grava no cache local (último snapshot)
    const localSnapshot = {
      timestamp: now.toISOString(),
      tokenPriceUsd: currentTokenUsd,
      items: nftList.map((n: Record<string, any>) => ({
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
    
    // 1.5 Grava um baseline local que não é sobrescrito a cada F5, para usar como fallback dos Movers
    const existingBaseline = getLocalCache('sfl_baseline_nft_snapshot');
    const baselineAgeMs = existingBaseline ? Date.now() - new Date(existingBaseline.timestamp).getTime() : Infinity;
    // Só atualiza o baseline se tiver mais de 8 horas de idade
    if (baselineAgeMs > 8 * 60 * 60 * 1000) {
      setLocalCache('sfl_baseline_nft_snapshot', localSnapshot);
    }

    // 2. Transmissão para o Supabase (DESATIVADO - ARCH-01)
    // A gravação global agora é responsabilidade exclusiva de Edge Functions ou Cron Jobs (service_role)
    // para evitar exposição de RLS e erros 42501 no console do cliente.
  } catch (e: unknown) {
    console.warn('[HistoryService] Falha ao registrar snapshot de NFTs:', e);
  }
}

/**
 * Busca histórico de Floor Price de um NFT específico no Supabase (com fallback local)
 */
export async function fetchNftHistory(nftId: string | number, timeframe: string | number = '30D', currentFloorSfl: number = 0, nftName: string | number = '') {
  if (nftId === undefined || nftId === null) return [];

  let days = 30;
  const tfStr = String(timeframe as any).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];

  let rawPoints: { timestamp?: string; day?: string; floor_sfl?: number; price_sfl?: number; floor_usd?: number; price_usd?: number; isInitialData?: boolean; t?: number; p?: number; volume?: number; [key: string]: unknown }[] = []; // timestamp?: string; day?: string; floor_sfl?: number; price_sfl?: number; floor_usd?: number; price_usd?: number; isInitialData?: boolean; t?: number; p?: number; volume?: number; [key: string]: unknown }[] = [];

  // Se timeframe for 24h ou 7D, prioriza tabela bruta nft_price_history
  if (days <= 7) {
    try {
      let query = supabase
        .from('nft_price_history')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
      if (nftName) {
        const cleanName = String(nftName).replace(' (Wearable)', '');
        const col = String(nftName).includes('(Wearable)') ? 'wearables' : 'collectibles';
        query = (query as any).eq('name', cleanName).eq('collection', col) as any;
      } else {
        query = (query as any).eq('nft_id', Number(nftId as any)) as any;
      }

      const { data, error } = await withTimeout<any>(query as any);

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map((d: any) => ({
          timestamp: d.timestamp,
          floor_sfl: Number(d.floor_sfl),
          price_sfl: Number(d.floor_sfl),
          floor_usd: Number(d.floor_usd),
          price_usd: Number(d.floor_usd),
          last_sale_sfl: d.last_sale_sfl ? Number(d.last_sale_sfl) : null
        }));
      }
    } catch (err: unknown) {
      console.warn(`[HistoryService] Erro ao consultar nft_price_history para NFT #${nftId}:`, (err as Error)?.message || err);
    }
  }

  // Se não encontrou ou timeframe for 30D/90D, busca na View agregada v_nft_daily_metrics
  if (rawPoints.length === 0) {
    try {
      let query = supabase
        .from('v_nft_daily_metrics')
        .select('*')
        .gte('day', dateStr)
        .order('day', { ascending: true });
      if (nftName) {
        const cleanName = String(nftName).replace(' (Wearable)', '');
        const col = String(nftName).includes('(Wearable)') ? 'wearables' : 'collectibles';
        query = (query as any).eq('name', cleanName).eq('collection', col) as any;
      } else {
        query = (query as any).eq('nft_id', Number(nftId as any)) as any;
      }

      const { data, error } = await withTimeout<any>(query as any);

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map((d: any) => ({
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
    } catch (err: unknown) {
      console.warn(`[HistoryService] Erro ao consultar v_nft_daily_metrics para NFT #${nftId}:`, (err as Error)?.message || err);
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
  } else if (currentFloorSfl > 0) {
    // Filtro de sanidade: descarta pontos históricos com valores impossíveis
    // (dados corrompidos de IDs de NFTs reciclados para itens diferentes no passado)
    const sanityMin = currentFloorSfl / 20;
    const sanityMax = currentFloorSfl * 20;
    const sanityFiltered = rawPoints.filter((p: Record<string, any>) => {
      const v = Number(p.floor_sfl || p.price_sfl || p.avg_floor_sfl || p.avg_price_sfl || 0);
      return v > 0 && v >= sanityMin && v <= sanityMax;
    });
    if (sanityFiltered.length > 0) {
      rawPoints = sanityFiltered;
    } else {
      // Todos os dados históricos são suspeitos — usa apenas o ponto atual
      const now = new Date();
      const price = Number(currentFloorSfl);
      rawPoints = [{
        timestamp: now.toISOString(),
        day: now.toISOString().split('T')[0],
        floor_sfl: price,
        price_sfl: price,
        isInitialData: true
      }];
    }
  }

  const aggregated = aggregateHistoryByInterval(rawPoints, timeframe, currentFloorSfl);
  const withSma7 = calculateMovingAverage(aggregated, 7, 'price_sfl');
  return calculateMovingAverage(withSma7, 30, 'price_sfl');
}

/**
 * Cache em memória para os baselines de variação de NFTs por período
 */
/**
 * Calcula os Destaques de Mercado (Maiores Altas e Maiores Baixas) para NFTs baseado no Floor Price
 */
export async function fetchNftMarketMovers(currentNftList: any[] = [], timeframe: '24h' | '7D' | '30D' | '90D' = '24h'): Promise<MarketMoversResult> {
  const targetTimeMs = getTargetTimestamp(timeframe);
  const nowMs = Date.now();
  
  
  let baselineMap: Record<string, number> = {};
  let oldestFoundMs = nowMs;

  try {
    if (timeframe === '24h') {
      const windowStart = new Date(targetTimeMs - 4 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(targetTimeMs + 4 * 60 * 60 * 1000).toISOString();
      
      const { data: rawHistory, error: rawError } = await supabase
        .from('nft_price_history')
        .select('name, collection, floor_sfl, timestamp')
        .gte('timestamp', windowStart)
        .lte('timestamp', windowEnd)
        .order('timestamp', { ascending: true })
        .limit(3000);

      if (!rawError && Array.isArray(rawHistory) && rawHistory.length > 0) {
        const byName: Record<string, typeof rawHistory> = {};
        rawHistory.forEach((r) => {
          const key = `${r.collection || ''}_${r.name || ''}`;
          if (!byName[key]) byName[key] = [];
          byName[key].push(r);
        });

        Object.entries(byName).forEach(([nftName, rows]) => {
          const futureRows = rows.filter(r => new Date(r.timestamp).getTime() >= targetTimeMs);
          if (futureRows.length > 0) {
            const closest = futureRows[0];
            const closestAge = nowMs - new Date(closest.timestamp).getTime();
            if (closest.floor_sfl > 0) {
              baselineMap[nftName] = Number(closest.floor_sfl);
              if (closestAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - closestAge;
            }
          }
        });
      }
    } else {
      const targetDay = new Date(targetTimeMs).toISOString().split('T')[0];
      const startDay = new Date(targetTimeMs - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDay = new Date(targetTimeMs + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: dailyMetrics, error: dailyError } = await supabase
        .from('v_nft_daily_metrics')
        .select('name, collection, day, avg_floor_sfl')
        .gte('day', startDay)
        .lte('day', endDay)
        .order('day', { ascending: true });

      if (!dailyError && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
        const byName: Record<string, typeof dailyMetrics> = {};
        dailyMetrics.forEach((r) => {
          const key = `${r.collection || ''}_${r.name || ''}`;
          if (!byName[key]) byName[key] = [];
          byName[key].push(r);
        });

        Object.entries(byName).forEach(([nftName, rows]) => {
          const futureRows = rows.filter(r => (r.day || '') >= targetDay);
          if (futureRows.length > 0) {
            const closest = futureRows[0];
            baselineMap[nftName] = Number(closest.avg_floor_sfl);
            const rowAge = nowMs - new Date(closest.day!).getTime();
            if (rowAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - rowAge;
          }
        });
      }
    }
  } catch (err: unknown) {
    console.warn(`[HistoryService] Supabase indisponível para movers NFT (${timeframe}):`, err);
  }

  const items: MoverItem[] = [];
  
  currentNftList.forEach((nft) => {
    const currentPrice = Number(nft.floor || nft.currentPrice || 0);
    const rawName = String(nft.name || '');
    const nftId = Number(nft.nft_id || nft.id || 0);
    const col = String(nft.collection || '');
    const key = `${col}_${rawName}`;
    
    if (!currentPrice || currentPrice <= 0 || !rawName) return;
    
    const basePrice = baselineMap[key];
    if (basePrice && basePrice > 0) {
      const changePct = computeChangePct(currentPrice, basePrice);
      if (changePct !== null) {
        items.push({
          name: String(nft.name || `NFT ${nftId}`),
          currentPriceSfl: currentPrice,
          basePriceSfl: basePrice,
          changePct,
          isNft: true,
          nft_id: nftId,
          collection: String(nft.collection || ''),
          boost_text: nft.boost_text ? String(nft.boost_text) : undefined
        });
      }
    }
  });

  const ranked = rankMovers(items);
  const actualAgeMs = nowMs - oldestFoundMs;
  ranked.actualTimeframeLabel = getActualTimeframeLabel(timeframe, actualAgeMs);
  
  return ranked;
}
