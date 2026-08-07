// Key constants and default configuration
import { getBumpkinLevel } from '../utils/bumpkinLevel';

const CACHE_PREFIX = 'sfl_cache_';
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutos de TTL para cache de contingência

/**
 * Utilitários de Cache no localStorage com expiração (TTL)
 */
export function getCachedData(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - parsed.timestamp;
    return {
      data: parsed.data,
      timestamp: parsed.timestamp,
      isExpired: age > DEFAULT_TTL_MS,
      age
    };
  } catch (e) {
    console.warn(`[Cache] Falha ao ler cache para ${key}:`, e);
    return null;
  }
}

export function setCachedData(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    console.warn(`[Cache] Falha ao salvar cache no localStorage:`, e);
  }
}

/**
 * Estratégia de requisição resiliente com fallback de proxies (Direto -> Worker -> CorsProxy)
 */
export async function fetchWithFallback(url, options = {}) {
  const { headers = {}, timeout = 4500 } = options;

  const strategies = [
    // 1. Cloudflare Worker Personalizado (Mais estável e sem erros de CORS no console)
    async () => {
      const workerUrl = `https://sfltrade.asaphgabrielsousa.workers.dev/?url=${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(workerUrl, { headers, signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`Worker HTTP ${response.status}`);
        const text = await response.text();
        const match = text.match(/<pre>([\s\S]*?)<\/pre>/);
        if (match) return JSON.parse(match[1]);
        return JSON.parse(text);
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    },
    // 2. Conexão Direta ao Endpoint (Pode gerar erro de CORS no console localmente)
    async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    },
    // 3. CorsProxy.io Fallback
    async () => {
      const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(corsProxyUrl, { headers, signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`CorsProxy HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    }
  ];

  let lastError = null;
  for (const strategy of strategies) {
    try {
      const data = await strategy();
      if (data) return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Todas as tentativas de conexão falharam para: ${url}`);
}

/**
 * Resolve nome de usuário para Farm ID (usando sfl.world)
 */
export async function resolveFarmIdFromUsername(username) {
  try {
    const url = `https://sfl.world/api/v1/land/info/username/${encodeURIComponent(username)}`;
    const cacheKey = `user_${username.toLowerCase()}`;
    const data = await fetchWithFallback(url);
    if (data && data.farm_id) {
      setCachedData(cacheKey, data.farm_id);
      return data.farm_id;
    }
  } catch (err) {
    console.warn(`[API] Erro ao converter username '${username}':`, err);
    const cached = getCachedData(`user_${username.toLowerCase()}`);
    if (cached) return cached.data;
  }
  return null;
}

/**
 * Requisição 1: Endpoint Público / Agregador (sfl.world)
 */
export async function fetchPublicLandData(farmId) {
  const url = `https://sfl.world/api/v1.1/land/${farmId}`;
  return await fetchWithFallback(url);
}

/**
 * Requisição 2: Endpoint Oficial Autenticado (sunflower-land.com)
 * Requer x-api-key no cabeçalho HTTP
 */
export async function fetchOfficialFarmData(farmId, apiKey) {
  if (!apiKey || !apiKey.startsWith('sfl.')) {
    throw new Error('API Key inválida ou ausente para requisição oficial.');
  }

  const url = `https://api.sunflower-land.com/community/farms/${farmId}`;
  const headers = {
    'x-api-key': apiKey.trim()
  };

  return await fetchWithFallback(url, { headers });
}

/**
 * Normaliza os dados retornados de ambas as APIs para manter compatibilidade no UI
 */
export function normalizeFarmResponse(rawData, source) {
  if (!rawData) return null;

  // Se vier da API Oficial (sunflower-land.com)
  if (source === 'official' || rawData.farm) {
    const f = rawData.farm || rawData;
    const computedLevel = f.bumpkin?.experience ? getBumpkinLevel(f.bumpkin.experience) : (f.bumpkin?.level || f.level || 1);

    return {
      source: 'official',
      land: {
        id: f.id,
        type: f.island?.type || f.island || 'volcano',
        level: computedLevel,
        coins: f.coins || 0,
        balance: parseFloat(f.balance || 0),
        gem: f.inventory?.Gem || 0,
        marks: f.inventory?.Mark || 0,
        charm: f.inventory?.['Love Charm'] || 0,
        cheer: f.inventory?.Cheer || 0,
        taxResource: 0.15,
        verified: true,
        vip: Boolean(f.inventory?.['Gold Pass'] || f.vip),
        inventory: f.inventory || {}
      },
      bumpkin: f.bumpkin ? {
        level: computedLevel,
        experience: f.bumpkin.experience || 0,
        skills: f.bumpkin.skills || {}
      } : null
    };
  }

  // Se vier do Agregador Público (sfl.world)
  return {
    source: 'public',
    land: rawData.land || rawData,
    bumpkin: rawData.bumpkin || null
  };
}

/**
 * Orquestrador Dual com Fallback e Cache por TTL
 */
export async function fetchFarmDataSmart({ farmId, apiKey = '', forceRefresh = false }) {
  if (!farmId) return null;
  const cacheKey = `farm_${farmId}`;

  // 1. Verificar Cache se não for atualização forçada
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached && !cached.isExpired) {
      return { ...cached.data, isFromCache: true };
    }
  }

  let result = null;
  let source = null;

  // 2. Tentar Endpoint Oficial Autenticado se houver chave sfl.*
  if (apiKey && apiKey.trim().startsWith('sfl.')) {
    try {
      const rawOfficial = await fetchOfficialFarmData(farmId, apiKey);
      result = normalizeFarmResponse(rawOfficial, 'official');
      source = 'official';
    } catch (err) {
      console.warn('[DualAPI] Erro no endpoint Oficial Autenticado, aplicando fallback público:', err.message);
    }
  }

  // 3. Fallback ou Consulta Direta via Agregador Público (sfl.world)
  if (!result) {
    try {
      const rawPublic = await fetchPublicLandData(farmId);
      if (rawPublic && rawPublic.land) {
        result = normalizeFarmResponse(rawPublic, 'public');
        source = 'public';
      }
    } catch (err) {
      console.warn('[DualAPI] Erro no endpoint Público:', err.message);
    }
  }

  // 4. Se ambas falharem, retornar Cache antigo se existir
  if (!result) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      return { ...cached.data, isFromCache: true, source: cached.data.source || 'cache' };
    }
    throw new Error('Não foi possível obter dados da fazenda em nenhum endpoint ou cache.');
  }

  // 5. Salvar resultado no Cache local
  setCachedData(cacheKey, result);
  return { ...result, isFromCache: false };
}