import re
import sys

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

imports = "import { computeChangePct, rankMovers, getTargetTimestamp, getActualTimeframeLabel, MoverItem, MarketMoversResult } from '../utils/marketMath';\n"
code = re.sub(r"import \{ supabase \} from '\./supabase';\n", f"import {{ supabase }} from './supabase';\n{imports}", code, count=1)

new_market_movers = """export async function fetchMarketMovers(currentMarketData: Record<string, number> = {}, timeframe: '24h' | '7D' | '30D' | '90D' = '24h'): Promise<MarketMoversResult> {
  const targetTimeMs = getTargetTimestamp(timeframe);
  const nowMs = Date.now();
  const minAgeMs = timeframe === '24h' ? 12 * 60 * 60 * 1000 : 3.5 * 24 * 60 * 60 * 1000;
  
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
            if (closestAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - closestAge;
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
          const pastRows = rows.filter(r => (r.day || '') <= targetDay);
          if (pastRows.length > 0) {
            const closest = pastRows[pastRows.length - 1];
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
}"""

new_nft_movers = """export async function fetchNftMarketMovers(currentNftList: any[] = [], timeframe: '24h' | '7D' | '30D' | '90D' = '24h'): Promise<MarketMoversResult> {
  const targetTimeMs = getTargetTimestamp(timeframe);
  const nowMs = Date.now();
  const minAgeMs = timeframe === '24h' ? 12 * 60 * 60 * 1000 : 3.5 * 24 * 60 * 60 * 1000;
  
  let baselineMap: Record<number, number> = {};
  let oldestFoundMs = nowMs;

  try {
    if (timeframe === '24h') {
      const windowStart = new Date(targetTimeMs - 4 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(targetTimeMs + 4 * 60 * 60 * 1000).toISOString();
      
      const { data: rawHistory, error: rawError } = await supabase
        .from('nft_price_history')
        .select('nft_id, floor_sfl, timestamp')
        .gte('timestamp', windowStart)
        .lte('timestamp', windowEnd)
        .order('timestamp', { ascending: true })
        .limit(3000);

      if (!rawError && Array.isArray(rawHistory) && rawHistory.length > 0) {
        const byId: Record<number, typeof rawHistory> = {};
        rawHistory.forEach((r) => {
          if (!byId[r.nft_id]) byId[r.nft_id] = [];
          byId[r.nft_id].push(r);
        });

        Object.entries(byId).forEach(([idStr, rows]) => {
          const nftId = Number(idStr);
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
          if (closest && closest.floor_sfl > 0 && closestAge >= minAgeMs) {
            baselineMap[nftId] = Number(closest.floor_sfl);
            if (closestAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - closestAge;
          }
        });
      }
    } else {
      const targetDay = new Date(targetTimeMs).toISOString().split('T')[0];
      const startDay = new Date(targetTimeMs - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDay = new Date(targetTimeMs + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: dailyMetrics, error: dailyError } = await supabase
        .from('v_nft_daily_metrics')
        .select('nft_id, day, avg_floor_sfl')
        .gte('day', startDay)
        .lte('day', endDay)
        .order('day', { ascending: true });

      if (!dailyError && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
        const byId: Record<number, typeof dailyMetrics> = {};
        dailyMetrics.forEach((r) => {
          const nid = r.nft_id || 0;
          if (!byId[nid]) byId[nid] = [];
          byId[nid].push(r);
        });

        Object.entries(byId).forEach(([idStr, rows]) => {
          const nftId = Number(idStr);
          const pastRows = rows.filter(r => (r.day || '') <= targetDay);
          if (pastRows.length > 0) {
            const closest = pastRows[pastRows.length - 1];
            baselineMap[nftId] = Number(closest.avg_floor_sfl);
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
    const nftId = Number(nft.nft_id || nft.id || 0);
    if (!currentPrice || currentPrice <= 0 || !nftId) return;
    
    const basePrice = baselineMap[nftId];
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
}"""

code = re.sub(r'export async function fetchMarketMovers[\s\S]*?hasData: variations\.length > 0\s*};\s*}', new_market_movers, code, flags=re.MULTILINE)
code = re.sub(r'export async function fetchNftMarketMovers[\s\S]*?hasData: variations\.length > 0\s*};\s*}', new_nft_movers, code, flags=re.MULTILINE)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Done python script")
