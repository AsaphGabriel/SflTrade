import type { NftItem } from './historyService';
// Key constants and default configuration
import { getBumpkinLevel } from '../utils/bumpkinLevel';

const CACHE_PREFIX = 'sfl_cache_';
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutos de TTL para cache de contingência

/**
 * Utilitários de Cache no localStorage com expiração (TTL)
 */
export function getCachedData(key: string) {
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

export function setCachedData(key: string, data: unknown) {
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
export async function fetchWithFallback(url: string, options: RequestInit & { timeout?: number } = {}) {
  const { headers = {}, timeout = 4500 } = options;

  const strategies = [
    // 1. Cloudflare Worker Dedicado (Proxy Primário Homologado)
    async () => {
      const workerUrl = `https://sfltrade.asaphgabrielsousa.workers.dev/?url=${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(workerUrl, { headers, signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`Worker HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    },
    // 2. Conexão Direta ao Endpoint
    async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`Direct HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    },
    // 3. Fallback Público CorsProxy (Apenas se NÃO houver chave sensível)
    async () => {
      const hasSensitiveKey = Boolean(
        (headers as Record<string, string>)['x-api-key'] || 
        (headers as Record<string, string>)['Authorization']
      );
      if (hasSensitiveKey) {
        throw new Error('Proxy público bloqueado por segurança para requisições autenticadas.');
      }
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
export async function resolveFarmIdFromUsername(username: string | number) {
  try {
    const url = `https://sfl.world/api/v1/land/info/username/${encodeURIComponent(username)}`;
    const cacheKey = `user_${String(username).toLowerCase()}`;
    const data = await fetchWithFallback(url);
    if (data && data.farm_id) {
      setCachedData(cacheKey, data.farm_id);
      return data.farm_id;
    }
  } catch (err) {
    console.warn(`[API] Erro ao converter username '${username}':`, err);
    const cached = getCachedData(`user_${String(username).toLowerCase()}`);
    if (cached) return cached.data;
  }
  return null;
}

/**
 * Requisição 1: Endpoint Público / Agregador (sfl.world)
 */
export async function fetchPublicLandData(farmId: string | number) {
  const url = `https://sfl.world/api/v1.1/land/${farmId}`;
  return await fetchWithFallback(url);
}

/**
 * Requisição 2: Endpoint Oficial Autenticado (sunflower-land.com)
 * Requer x-api-key no cabeçalho HTTP
 */
export async function fetchOfficialFarmData(farmId: string | number, apiKey: string) {
  if (!apiKey || !apiKey.startsWith('sfl.')) {
    throw new Error('API Key inválida ou ausente para requisição oficial.');
  }

  const url = `https://api.sunflower-land.com/community/farms/${farmId}`;
  const cleanKey = apiKey.trim();
  const headers = {
    'x-api-key': cleanKey,
    'Authorization': cleanKey.startsWith('Bearer ') ? cleanKey : `Bearer ${cleanKey}`
  };

  return await fetchWithFallback(url, { headers });
}

/**
 * Normaliza os dados retornados de ambas as APIs para manter compatibilidade no UI
 */
export function normalizeFarmResponse(rawData: { bumpkin?: { experience?: number; level?: number; equipped?: Record<string, string>; skills?: Record<string, number> }; inventory?: Record<string, string | number>; wardrobe?: Record<string, number>; coins?: number; gem?: number; [key: string]: unknown }, source: string) {
  if (!rawData) return null;

  // Se vier da API Oficial (sunflower-land.com)
  if (source === 'official' || rawData.farm) {
    const f = (rawData.farm || rawData) as { id?: string; island?: { type?: string } | string; coins?: number; balance?: string; inventory?: Record<string, number>; collectibles?: Record<string, number>; wardrobe?: Record<string, number>; bumpkin?: { experience?: number; level?: number; equipped?: Record<string, string>; skills?: Record<string, number> }; vip?: boolean; level?: number; };
    const computedLevel = f.bumpkin?.experience ? getBumpkinLevel(f.bumpkin.experience) : (f.bumpkin?.level || f.level || 1);

    // Unifica inventário sem duplicar: itens do baú + collectibles posicionados na ilha + wearables do wardrobe
    const fullInventory: Record<string, unknown> = {};

    const findExistingKey = (target: Record<string, number>, name: string) => {
      if (!name) return null;
      const targetLower = name.trim().toLowerCase();
      return Object.keys(target).find((k) => k.trim().toLowerCase() === targetLower);
    };

    const setOrMax = (target: Record<string, number>, name: string, count: number) => {
      if (!name || count <= 0) return;
      const cleanName = name.trim();
      const existingKey = findExistingKey(target, cleanName);
      if (existingKey) {
        target[existingKey] = Math.max(Number(target[existingKey]) || 0, count);
      } else {
        target[cleanName] = count;
      }
    };

    // 1. Inventário base (baú / itens totais)
    if (f.inventory && typeof f.inventory === 'object') {
      Object.entries(f.inventory).forEach(([itemName, rawQty]) => {
        const count = Number(rawQty) || 0;
        if (count > 0 && itemName) {
          setOrMax(fullInventory as unknown as Record<string, number>, itemName, count);
        }
      });
    }

    // 2. Collectibles (posicionados no mapa).
    // No Sunflower Land, f.inventory já contém a contagem total de itens/collectibles.
    // Usamos Math.max para preencher caso falte no inventário base, sem nunca somar/dobrar.
    if (f.collectibles && typeof f.collectibles === 'object') {
      Object.entries(f.collectibles).forEach(([collName, items]) => {
        const count = Array.isArray(items) ? items.length : Number(items || 0);
        if (count > 0 && collName) {
          setOrMax(fullInventory as unknown as Record<string, number>, collName, count);
        }
      });
    }

    // 3. Wardrobe (wearables do Bumpkin)
    if (f.wardrobe && typeof f.wardrobe === 'object') {
      Object.entries(f.wardrobe).forEach(([wName, qty]) => {
        const count = Number(qty) || 0;
        if (count > 0 && wName) {
          const cleanName = wName.trim();
          const isParsnip = cleanName.toLowerCase() === 'parsnip';
          const keyName = isParsnip ? 'Parsnip (Wearable)' : cleanName;
          setOrMax(fullInventory as unknown as Record<string, number>, keyName, count);
        }
      });
    }

    // 4. Bumpkin equipped (wearables atualmente vestidos)
    if (f.bumpkin?.equipped && typeof f.bumpkin.equipped === 'object') {
      Object.values(f.bumpkin.equipped).forEach((eqItem) => {
        if (eqItem && typeof eqItem === 'string') {
          const cleanName = eqItem.trim();
          const isParsnip = cleanName.toLowerCase() === 'parsnip';
          const keyName = isParsnip ? 'Parsnip (Wearable)' : cleanName;
          const existingKey = findExistingKey(fullInventory as unknown as Record<string, number>, keyName);
          if (!existingKey || Number(fullInventory[existingKey]) <= 0) {
            fullInventory[keyName] = 1;
          }
        }
      });
    }

    return {
      source: 'official',
      land: {
        id: f.id,
        type: (typeof f.island === 'string' ? f.island : f.island?.type) || f.island || 'volcano',
        level: computedLevel,
        coins: f.coins || 0,
        balance: parseFloat(String(f.balance || 0)),
        gem: f.inventory?.Gem || 0,
        marks: f.inventory?.Mark || 0,
        charm: f.inventory?.['Love Charm'] || 0,
        cheer: f.inventory?.Cheer || 0,
        taxResource: 0.15,
        verified: true,
        vip: Boolean(f.inventory?.['Gold Pass'] || f.vip),
        inventory: fullInventory,
        collectibles: f.collectibles || {},
        wardrobe: f.wardrobe || {}
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
export async function fetchFarmDataSmart({ farmId, apiKey = '', forceRefresh = false }: { farmId: number | string, apiKey?: string, forceRefresh?: boolean }) {
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
  
  // 2. Tentar Endpoint Oficial Autenticado se houver chave sfl.*
  if (apiKey && apiKey.trim().startsWith('sfl.')) {
    try {
      const rawOfficial = await fetchOfficialFarmData(farmId, apiKey);
      result = normalizeFarmResponse(rawOfficial, 'official');
      
    } catch (err) {
      console.warn('[DualAPI] Erro no endpoint Oficial Autenticado, aplicando fallback público:', (err as Error).message);
    }
  }

  // 3. Fallback ou Consulta Direta via Agregador Público (sfl.world)
  if (!result) {
    try {
      const rawPublic = await fetchPublicLandData(farmId);
      if (rawPublic && rawPublic.land) {
        result = normalizeFarmResponse(rawPublic, 'public');
        
      }
    } catch (err) {
      console.warn('[DualAPI] Erro no endpoint Público:', (err as Error).message);
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

/**
 * Indexa a lista de NFTs por nome, por (colecao_id) e pela chave tripla (colecao|id|nome).
 */
export function buildNftIndex(list: NftItem[]) {
  const byName: Record<string, NftItem> = {};
  const byId: Record<string, NftItem> = {};
  const byKey: Record<string, NftItem> = {};
  list.forEach((nft: NftItem) => {
    if (nft.displayName) {
      byName[nft.displayName] = nft;
      if (nft.displayName !== nft.name && nft.name && !byName[nft.name]) byName[nft.name] = nft;
    } else if (nft.name) {
      byName[nft.name] = nft;
    }
    if (nft.id !== undefined) {
      byId[`${nft.collection || 'unknown'}_${nft.id}`] = nft;
      byKey[`${String(nft.collection || 'collectibles').toLowerCase()}|${Number(nft.id) || 0}|${String(nft.name || '').trim().toLowerCase()}`] = nft;
    }
  });
  return { byName, byId, byKey };
}

/**
 * Busca cotações de NFTs (Floor e Last Sale) filtrando apenas itens com buff (have_boost === 1).
 * Garante que `floor` e `lastSalePrice` são sempre números válidos.
 */
export async function fetchNftMarketData(forceRefresh: boolean = false) {
  const cacheKey = 'nft_market_boosts';
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    // Invalida cache se os itens não tiverem floor populado (dados de versão antiga)
    const cacheIsValid = cached && !cached.isExpired &&
      Array.isArray(cached.data?.list) &&
      cached.data.list.length > 0 &&
      Number(cached.data.list[0]?.floor) > 0;
    if (cacheIsValid) {
      return cached.data;
    }
  }

  try {
    const data = await fetchWithFallback('https://sfl.world/api/v1/nfts');
    if (!data) return null;

    const collectibles = Array.isArray(data.collectibles) ? data.collectibles : [];
    const wearables = Array.isArray(data.wearables) ? data.wearables : [];

    const boostCollectibles = collectibles
      .filter((item: Record<string, unknown>) => item && item.have_boost === 1 && item.name)
      .map((item: Record<string, unknown>) => ({
        ...item,
        displayName: item.name, // collectibles usam o próprio nome como displayName
        collection: 'collectibles',
        floor: Number(item.floor) || 0,
        lastSalePrice: Number(item.lastSalePrice) || 0,
        image: `https://sunflower-land.com/play/erc1155/images/${item.id}.webp`
      }));

    const boostWearables = wearables
      .filter((item: Record<string, unknown>) => item && item.have_boost === 1 && item.name)
      .map((item: Record<string, unknown>) => {
        const isParsnipWearable = String(item.name).toLowerCase() === 'parsnip';
        const displayName = isParsnipWearable ? 'Parsnip (Wearable)' : item.name;
        return {
          ...item,
          displayName,
          collection: 'wearables',
          floor: Number(item.floor) || 0,
          lastSalePrice: Number(item.lastSalePrice) || 0,
          image: `https://sunflower-land.com/play/wearables/images/${item.id}.png`
        };
      });

    const allBoosts = [...boostCollectibles, ...boostWearables];

    const { byName, byId, byKey } = buildNftIndex(allBoosts as unknown as NftItem[]);

    const result = {
      list: allBoosts,
      byName,
      byId,
      byKey,
      updatedAt: data.updatedAt || Date.now()
    };

    setCachedData(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[API] Erro ao buscar cotações de NFTs:', err);
    const cached = getCachedData(cacheKey);
    if (cached) return cached.data;
    return null;
  }
}
