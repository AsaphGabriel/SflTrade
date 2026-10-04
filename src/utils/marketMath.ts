export interface MoverItem {
  name: string;
  currentPriceSfl: number;
  basePriceSfl: number;
  changePct: number;
  isNft: boolean;
  nft_id?: number;
  collection?: string;
  image?: string;
  boost_text?: string;
}

export interface MarketMoversResult {
  topGainers: MoverItem[];
  topLosers: MoverItem[];
  hasData: boolean;
  actualTimeframeLabel?: string; // If 30D wasn't fully reached, we can return the actual available timeframe (e.g. 14D)
}

/**
 * Calculates percentage change between current and base value safely.
 * Returns null if base is <= 0 or if values are invalid.
 */
export function computeChangePct(current: number | null | undefined, base: number | null | undefined): number | null {
  if (current === undefined || current === null || isNaN(current)) return null;
  if (base === undefined || base === null || isNaN(base)) return null;
  if (base <= 0) return null;
  
  const pct = ((current - base) / base) * 100;
  if (!isFinite(pct)) return null;
  
  return Number(pct.toFixed(2));
}

/**
 * Ranks items by percentage change, splitting into top gainers and losers.
 * Items with exactly 0% change or null change are discarded from rankings.
 */
export function rankMovers(items: MoverItem[]): MarketMoversResult {
  const validItems = items.filter(i => i.changePct !== 0 && !isNaN(i.changePct) && isFinite(i.changePct));
  
  // Gainers: Descending order (> 0)
  const gainers = validItems
    .filter(i => i.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 3);
    
  // Losers: Ascending order (< 0)
  const losers = validItems
    .filter(i => i.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 3);
    
  return {
    topGainers: gainers,
    topLosers: losers,
    hasData: gainers.length > 0 || losers.length > 0
  };
}

/**
 * Returns the expected target timestamp for a given timeframe label
 */
export function getTargetTimestamp(timeframe: '24h' | '7D' | '30D' | '90D', nowMs: number = Date.now()): number {
  switch (timeframe) {
    case '24h': return nowMs - 24 * 60 * 60 * 1000;
    case '7D': return nowMs - 7 * 24 * 60 * 60 * 1000;
    case '30D': return nowMs - 30 * 24 * 60 * 60 * 1000;
    case '90D': return nowMs - 90 * 24 * 60 * 60 * 1000;
    default: return nowMs - 24 * 60 * 60 * 1000;
  }
}

/**
 * Generates an actual timeframe label if the found baseline is significantly younger than requested.
 * E.g., if asked for 30D, but oldest record is 14D old.
 */
export function getActualTimeframeLabel(requestedTimeframe: string, foundAgeMs: number): string {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;
  
  if (requestedTimeframe === '24h') {
    if (foundAgeMs < 18 * ONE_HOUR) return `${Math.round(foundAgeMs / ONE_HOUR)}h`;
    return '24h';
  }
  
  const foundDays = Math.round(foundAgeMs / ONE_DAY);
  
  if (requestedTimeframe === '7D' && foundDays < 5) {
    return `${foundDays}D`;
  }
  if (requestedTimeframe === '30D' && foundDays < 25) {
    return `${foundDays}D`;
  }
  if (requestedTimeframe === '90D' && foundDays < 80) {
    return `${foundDays}D`;
  }
  
  return requestedTimeframe;
}
