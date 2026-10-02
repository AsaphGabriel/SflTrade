
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
export function calculateMovingAverage(data: Record<string, unknown>[] = [], windowSize: number = 7, valueKey: string = 'price_sfl') {
  if (!Array.isArray(data) || data.length === 0) return [];
  const safeWindow = Math.max(1, windowSize);
  let result: Record<string, unknown>[] = [];
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
    hourlyHistory = hourlyHistory.filter((h: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => (h.day || h.hourKey) >= cutoffStr);

    const existingHourlyIndex = hourlyHistory.findIndex((h: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => h.hourKey === hourKey);
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

    hourlyHistory.sort((a: { timestamp: number; [key: string]: unknown }, b: { timestamp: number; [key: string]: unknown }) => (a.hourKey || a.day).localeCompare(b.hourKey || b.day));

    // Downsampling: mantém todas as horas dos últimos 7 dias; para dias anteriores (até 90 dias), mantém apenas 1 amostra diária
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const seenDays = new Set();
    hourlyHistory = hourlyHistory.filter((h: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => {
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
async function withTimeout(promise: Promise<unknown>, timeoutMs: number = 2500) {
  let timeoutId;
  const timeoutPromise = new Promise((_: (value: unknown) => void, reject: (reason?: unknown) => void) => {
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
export function aggregateHistoryByInterval(rawData: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }[] = [], timeframe: string | number = '30D', fallbackPrice: number = 0) {
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
      .map((item: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }) => {
        const t = new Date(item.timestamp || item.day || 0).getTime();
        const p = Number(item.floor_sfl ?? item.avg_floor_sfl ?? item.price_sfl ?? item.avg_price_sfl ?? item.price_usd ?? item.price ?? 0);
        return { ...item, t, p };
      })
      .filter((item: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }) => !isNaN(item.t) && item.t > 0 && !isNaN(item.p) && item.p > 0)
      .sort((a: { timestamp: number; [key: string]: unknown }, b: { timestamp: number; [key: string]: unknown }) => a.t - b.t)
    : [];

  let buckets: { t: number; p: number; price_usd?: number }[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const bucketStartMs = nowMs - (numBuckets - i) * stepMs;
    const bucketEndMs = nowMs - (numBuckets - i - 1) * stepMs;
    const bucketMidMs = (bucketStartMs + bucketEndMs) / 2;
    const bucketEndDate = new Date(bucketEndMs);

    // Filtra pontos da série bruta dentro da janela do bucket
    const matches = sortedRaw.filter((item: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }) => item.t >= bucketStartMs && item.t < bucketEndMs);

    let avgVal = 0;
    let isFallback = false;

    if (matches.length > 0) {
      const sum = matches.reduce((acc: number, curr: { p: number; [key: string]: unknown }) => acc + curr.p, 0);
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

  return withSma30.map((item: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }) => ({
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
  const tfStr = String(timeframe).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days - 1);
  const isoStartDate = startDate.toISOString();

  let rawPoints: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }[] = [];

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
          rawPoints = historyList.map((h: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => ({
            timestamp: h.timestamp || h.day,
            price_usd: Number(h.token_price_usd)
          })).filter((h: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => h.price_usd > 0);
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
  const tfStr = String(timeframe).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days - 1);
  const dateStr = startDate.toISOString().split('T')[0];

  let rawPoints: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }[] = [];

  // Se timeframe for 24h ou 7D, prioriza a tabela bruta resource_price_history com timestamps precisos
  if (days <= 7) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('resource_price_history')
          .select('*')
          .eq('resource_id', resourceId as string)
          .gte('timestamp', startDate.toISOString())
          .order('timestamp', { ascending: true })
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map((d: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => ({
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
      const { data, error } = await withTimeout(
        supabase
          .from('v_resource_daily_metrics')
          .select('*')
          .eq('resource_id', resourceId as string)
          .gte('day', dateStr)
          .order('day', { ascending: true })
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map((d: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => ({
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
            .filter((h: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => h.resources && h.resources[resourceId] !== undefined)
            .map((h: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => {
              const pSfl = Number(h.resources[resourceId]);
              return {
                timestamp: h.timestamp || h.day,
                price_sfl: pSfl,
                price_usd: pSfl * (h.token_price_usd || 0.05)
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
const BASELINE_CACHE_TTL_MS = 3 * 60 * 1000; // Cache de 3 min apenas para a consulta de baseline no Supabase
const baselineCache: Record<string, unknown> = {};

export async function fetchMarketMovers(currentMarketData: Record<string, { sfl?: number; usd?: number; changePct?: number; [key: string]: unknown }> = {}, timeframe: string | number = '24h') {
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
  let baselineMap: Record<string, { baselineSfl: number; baselineUsd: number }> = {};
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
          const byRes: Record<string, { day: string; price_sfl: number; price_usd: number; [key: string]: unknown }[]> = {};
          rawHistory.forEach((r: { created_at?: string; timestamp?: string | number; resource_id?: string; price_sfl?: number; price_usd?: number; day?: string; [key: string]: unknown }) => {
            if (!byRes[r.resource_id]) byRes[r.resource_id] = [];
            byRes[r.resource_id].push(r);
          });

          Object.entries(byRes).forEach(([resId, rows]: [string, { day: string; price_sfl: number; price_usd: number; [key: string]: unknown }[]]) => {
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
          const byRes: Record<string, { day: string; price_sfl: number; price_usd: number; [key: string]: unknown }[]> = {};
          dailyMetrics.forEach((r: { created_at?: string; timestamp?: string | number; resource_id?: string; price_sfl?: number; price_usd?: number; day?: string; [key: string]: unknown }) => {
            if (!byRes[r.resource_id]) byRes[r.resource_id] = [];
            byRes[r.resource_id].push(r);
          });

          Object.entries(byRes).forEach(([resId, rows]: [string, { day: string; price_sfl: number; price_usd: number; [key: string]: unknown }[]]) => {
            const pastRows = rows.filter((r: { created_at?: string; timestamp?: string | number; resource_id?: string; price_sfl?: number; price_usd?: number; day?: string; [key: string]: unknown }) => r.day <= targetDateStr);
            if (pastRows.length > 0) {
              baselineMap[resId] = Number(pastRows[pastRows.length - 1].avg_price_sfl);
            }
          });
        }
      }
    } catch (err: unknown) {
      console.warn(`[HistoryService] Supabase indisponível para movers (${safeTimeframe}):`, (err as Error)?.message || err);
    }

    // Fallback local caso Supabase não tenha retornado baselines
    if (Object.keys(baselineMap).length === 0) {
      try {
        const rawHourly = localStorage.getItem(HOURLY_HISTORY_KEY) || localStorage.getItem(DAILY_HISTORY_KEY);
        if (rawHourly) {
          const historyList = JSON.parse(rawHourly);
          if (Array.isArray(historyList) && historyList.length > 0) {
            const sorted = [...historyList].sort((a: { timestamp: number; [key: string]: unknown }, b: { timestamp: number; [key: string]: unknown }) =>
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
              Object.entries(bestSnapshot.resources).forEach(([resId, price]: [string, number]) => {
                if (Number(price) > 0) {
                  baselineMap[resId] = Number(price);
                }
              });
            }
          }
        }
      } catch (e: unknown) {
        console.warn('[HistoryService] Erro ao carregar baseline local para movers:', e);
      }
    }

    baselineCache[safeTimeframe] = {
      timestamp: nowMs,
      map: baselineMap
    };
  }

  // 2. Calcula as variações percentuais usando a cotação real AO VIVO enviada em currentMarketData
  let variations: { resource: string; sfl: number; usd: number; changePct: number; baselineSfl: number; baselineUsd: number; [key: string]: unknown }[] = [];

  Object.entries(currentMarketData).forEach(([resourceId, rawCurrent]: [string, { sfl?: number; usd?: number; changePct?: number; [key: string]: unknown }]) => {
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
  variations.sort((a: { timestamp: number; [key: string]: unknown }, b: { timestamp: number; [key: string]: unknown }) => b.changePct - a.changePct);

  // Top 3 que mais valorizaram (apenas os que tiveram variação real)
  const topGainers = variations.filter((v: { changePct: number; [key: string]: unknown }) => v.changePct > 0).slice(0, 3);

  // Top 3 que mais desvalorizaram (apenas os que tiveram variação negativa real)
  const topLosers = [...variations].filter((v: { changePct: number; [key: string]: unknown }) => v.changePct < 0).reverse().slice(0, 3);

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
export function recordNftSnapshot(tokenPriceUsd: number = 0.05, nftList: NftItem[] = []) {
  if (!Array.isArray(nftList) || nftList.length === 0) return;

  try {
    const now = new Date();
    const currentTokenUsd = Number(tokenPriceUsd || 0.05);

    // 1. Grava no cache local (último snapshot)
    const localSnapshot = {
      timestamp: now.toISOString(),
      tokenPriceUsd: currentTokenUsd,
      items: nftList.map((n: { name?: string; floor?: number; [key: string]: unknown }) => ({
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
  const tfStr = String(timeframe).toUpperCase();
  if (tfStr === '24H' || tfStr === '1' || tfStr === '24') days = 1;
  else if (tfStr === '7D' || tfStr === '7') days = 7;
  else if (tfStr === '30D' || tfStr === '30') days = 30;
  else if (tfStr === '90D' || tfStr === '90') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days - 1);
  const dateStr = startDate.toISOString().split('T')[0];

  let rawPoints: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }[] = [];

  // Se timeframe for 24h ou 7D, prioriza tabela bruta nft_price_history
  if (days <= 7) {
    try {
      let query = supabase
        .from('nft_price_history')
        .select('*')
        .eq('nft_id', Number(nftId))
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
        
      // @ts-ignore
      if (nftName) query = query.eq('name', nftName);

      const { data, error } = await withTimeout(query);

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map((d: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => ({
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
        .eq('nft_id', Number(nftId))
        .gte('day', dateStr)
        .order('day', { ascending: true });
        
      // @ts-ignore
      if (nftName) query = query.eq('name', nftName);

      const { data, error } = await withTimeout(query);

      if (!error && Array.isArray(data) && data.length > 0) {
        rawPoints = data.map((d: { created_at?: string; timestamp?: string | number; price_sfl?: number; price?: number; price_usd?: number; volume?: number; resources?: Record<string, number>; [key: string]: unknown }) => ({
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
    const sanityFiltered = rawPoints.filter((p: { p: number; price_usd?: number; [key: string]: unknown }) => {
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
const nftBaselineCache: Record<string, any> = {
  '24h': null,
  '7D': null,
  '30D': null,
  '90D': null
};

/**
 * Calcula os Destaques de Mercado (Maiores Altas e Maiores Baixas) para NFTs baseado no Floor Price
 */
export async function fetchNftMarketMovers(nftMarketList: NftItem[] = [], timeframe: string | number = '24h') {
  // @ts-ignore
  const safeTimeframe = ['24h', '7D', '30D', '90D'].includes(timeframe) ? timeframe : '24h';
  const nowMs = Date.now();

  const timeframeConfig = {
    '24h': { targetDays: 1, minAgeHours: 2, cacheTtlMs: 15 * 60 * 1000 },
    '7D':  { targetDays: 7, minAgeHours: 24, cacheTtlMs: 30 * 60 * 1000 },
    '30D': { targetDays: 30, minAgeHours: 72, cacheTtlMs: 60 * 60 * 1000 },
    '90D': { targetDays: 90, minAgeHours: 168, cacheTtlMs: 60 * 60 * 1000 }
  };

  // @ts-ignore
  const { targetDays, minAgeHours, cacheTtlMs } = timeframeConfig[safeTimeframe];
  const targetTimeMs = nowMs - (targetDays * 24 * 60 * 60 * 1000);

  let baselineMap: Record<string, { baselineSfl: number; baselineUsd: number }> = {};
  const cached = nftBaselineCache[safeTimeframe];

  if (cached && (nowMs - cached.timestamp < cacheTtlMs) && cached.map && Object.keys(cached.map).length > 0) {
    baselineMap = cached.map;
  } else {
    try {
      if (safeTimeframe === '24h') {
        // @ts-ignore
        const targetDate = new Date(targetTimeMs);
        // Ampliamos a janela para capturar qualquer histórico entre 36h atrás até 2h atrás.
        // Isso garante que no primeiro dia de uso (antes de bater 24h completas), 
        // ele pegue o registro mais antigo disponível (ex: de 10h atrás) para mostrar alguma variação.
        const windowStart = new Date(nowMs - (36 * 60 * 60 * 1000)).toISOString();
        const windowEnd = new Date(nowMs - (2 * 60 * 60 * 1000)).toISOString();

        const { data, error } = await withTimeout(
          supabase
            .from('nft_price_history')
            .select('nft_id, name, collection, floor_sfl, timestamp')
            .gte('timestamp', windowStart)
            .lte('timestamp', windowEnd)
            .order('timestamp', { ascending: false })
            .limit(2000)
        );

        if (!error && Array.isArray(data) && data.length > 0) {
          const byNft: Record<string, { day: string; price_sfl: number; price_usd: number; [key: string]: unknown }[]> = {};
          data.forEach((r: { created_at?: string; timestamp?: string | number; resource_id?: string; price_sfl?: number; price_usd?: number; day?: string; [key: string]: unknown }) => {
            const key = `${r.name}_${r.collection}_${r.nft_id}`;
            if (!byNft[key]) byNft[key] = [];
            byNft[key].push(r);
          });
          Object.entries(byNft).forEach(([key, rows]: [string, { day: string; price_sfl: number; price_usd: number; [key: string]: unknown }[]]) => {
            let closest = rows[0];
            let minDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTimeMs);
            for (const row of rows) {
              const diff = Math.abs(new Date(row.timestamp).getTime() - targetTimeMs);
              if (diff < minDiff) {
                minDiff = diff;
                closest = row;
              }
            }
            if (closest && Number(closest.floor_sfl) > 0) {
              baselineMap[key] = Number(closest.floor_sfl);
            }
          });
        }
      } else {
        const windowStartStr = new Date(targetTimeMs - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const windowEndStr = new Date(targetTimeMs + (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

        const { data, error } = await withTimeout(
          supabase
            .from('v_nft_daily_metrics')
            .select('nft_id, name, collection, avg_floor_sfl, day')
            .gte('day', windowStartStr)
            .lte('day', windowEndStr)
            .order('day', { ascending: false })
            .limit(1000)
        );

        if (!error && Array.isArray(data) && data.length > 0) {
          const byNft: Record<string, { day: string; price_sfl: number; price_usd: number; [key: string]: unknown }[]> = {};
          data.forEach((r: { created_at?: string; timestamp?: string | number; resource_id?: string; price_sfl?: number; price_usd?: number; day?: string; [key: string]: unknown }) => {
            const key = `${r.name}_${r.collection}_${r.nft_id}`;
            if (!byNft[key]) byNft[key] = [];
            byNft[key].push(r);
          });
          Object.entries(byNft).forEach(([key, rows]: [string, { day: string; price_sfl: number; price_usd: number; [key: string]: unknown }[]]) => {
            let closest = rows[0];
            let minDiff = Math.abs(new Date(closest.day).getTime() - targetTimeMs);
            for (const row of rows) {
              const diff = Math.abs(new Date(row.day).getTime() - targetTimeMs);
              if (diff < minDiff) {
                minDiff = diff;
                closest = row;
              }
            }
            if (closest && Number(closest.avg_floor_sfl) > 0) {
              baselineMap[key] = Number(closest.avg_floor_sfl);
            }
          });
        }
      }
    } catch (err: unknown) {
      console.warn(`[HistoryService] Supabase indisponível para movers de NFT (${safeTimeframe}):`, (err as Error)?.message || err);
    }

    // Fallback local: usa o baseline local ou o último snapshot de NFTs
    if (Object.keys(baselineMap).length === 0) {
      try {
        const rawBaseline = localStorage.getItem('sfl_baseline_nft_snapshot') || localStorage.getItem('sfl_last_nft_snapshot');
        if (rawBaseline) {
          const wrapper = JSON.parse(rawBaseline);
          const snapshot = wrapper.data || wrapper;
          const snapshotAgeMs = nowMs - new Date(snapshot.timestamp || wrapper.timestamp).getTime();
          
          // Removemos o critério de idade mínima no fallback local temporariamente 
          // para garantir que o usuário veja os cards imediatamente.
          const minFallbackAgeMs = 0; 
          
          if (snapshotAgeMs >= minFallbackAgeMs && Array.isArray(snapshot.items)) {
            snapshot.items.forEach((item: { t: number; p: number; price_usd?: number; volume?: number; [key: string]: unknown }) => {
              const key = `${item.name}_${item.collection}_${item.nft_id || item.id}`;
              if (Number(item.floor) > 0) {
                baselineMap[key] = Number(item.floor);
              }
            });
          }
        }
      } catch (e: unknown) {}
    }

    nftBaselineCache[safeTimeframe] = {
      timestamp: nowMs,
      map: baselineMap
    };
  }

  // Calcula variações percentuais baseadas no Floor Price
  let variations: { resource: string; sfl: number; usd: number; changePct: number; baselineSfl: number; baselineUsd: number; [key: string]: unknown }[] = [];
  const safeList = Array.isArray(nftMarketList) ? nftMarketList : [];

  safeList.forEach((nft: { name?: string; floor?: number; [key: string]: unknown }) => {
    const currentFloor = Number(nft.floor);
    if (!currentFloor || isNaN(currentFloor) || currentFloor <= 0) return;

    const key = `${nft.name}_${nft.collection}_${nft.id}`;
    const baseFloor = Number(baselineMap[key]);

    // Só calcula se houver baseline real
    if (baseFloor > 0) {
      const diff = currentFloor - baseFloor;
      const changePct = (diff / baseFloor) * 100;

      if (isFinite(changePct) && !isNaN(changePct)) {
        variations.push({
          resource: nft.name,
          nft_id: nft.id,
          name: nft.name,
          displayName: nft.displayName || nft.name,
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

  // Ordenação correta: desc por changePct
  variations.sort((a: { timestamp: number; [key: string]: unknown }, b: { timestamp: number; [key: string]: unknown }) => b.changePct - a.changePct);

  const topGainers = variations.filter((v: { changePct: number; [key: string]: unknown }) => v.changePct > 0).slice(0, 3);
  const topLosers = variations.filter((v: { changePct: number; [key: string]: unknown }) => v.changePct < 0).slice(-3).reverse();

  return {
    timeframe: safeTimeframe,
    topGainers: topGainers.length > 0 ? topGainers : variations.slice(0, 3),
    topLosers: topLosers.length > 0 ? topLosers : [...variations].reverse().slice(0, 3),
    hasData: variations.length > 0
  };
}
