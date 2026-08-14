import { supabase } from './supabase';

const TOKEN_CACHE_KEY = 'sfl_token_history_cache';
const RESOURCE_CACHE_KEY_PREFIX = 'sfl_res_history_cache_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de TTL para cache de histórico

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

  // 2. Tentar Cache Local (se contiver dados reais de consultas anteriores)
  const cached = getLocalCache(TOKEN_CACHE_KEY);
  if (cached && cached.data && cached.data.length > 0 && !cached.data.every(d => d.source === 'simulated_fallback')) {
    return cached.data;
  }

  // 3. Ponto único do preço real do dia atual
  const initialData = createInitialTokenPoint(currentPrice);
  setLocalCache(TOKEN_CACHE_KEY, initialData);
  return initialData;
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

  // 3. Tentar Cache Local (se contiver dados reais)
  const cached = getLocalCache(cacheKey);
  if (cached && cached.data && cached.data.length > 0 && !cached.data.every(d => d.records_count === 10 && d.avg_price_usd === d.avg_price_sfl * 0.05)) {
    return cached.data;
  }

  // 4. Ponto único do preço real do dia atual
  const initialData = createInitialResourcePoint(resourceId, currentPriceSfl);
  setLocalCache(cacheKey, initialData);
  return initialData;
}
