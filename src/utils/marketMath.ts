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
  timeframe?: string;
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

/**
 * Calculates effective island tax rate considering VIP discount and Shrine discount.
 * Base rates: petal = 50%, desert = 20%, volcano = 15%, basic = 0%, default = 15%.
 * VIP cuts the rate in half.
 * Shrine reduces the rate by 2.5% (-0.025).
 * Guaranteed non-negative (clamped to 0).
 */
export function calculateEffectiveTax(island: string, isVip: boolean = false, isShrine: boolean = false): number {
  if (island === 'basic') return 0;
  
  const taxasBase: Record<string, number> = {
    petal: 0.50,
    desert: 0.20,
    volcano: 0.15
  };
  
  let taxa = taxasBase[island] ?? 0.15;
  if (isVip) taxa = taxa / 2;
  if (isShrine) taxa = Math.max(0, taxa - 0.025);
  
  return Number(taxa.toFixed(4));
}

/**
 * Calculates percentage bid-ask spread: ((askPrice - bidPrice) / askPrice) * 100.
 * Returns null if askPrice <= 0, bidPrice < 0, or if values are invalid.
 */
export function calculateSpreadPct(askPrice: number | null | undefined, bidPrice: number | null | undefined): number | null {
  if (askPrice === undefined || askPrice === null || isNaN(askPrice) || !isFinite(askPrice)) return null;
  if (bidPrice === undefined || bidPrice === null || isNaN(bidPrice) || !isFinite(bidPrice)) return null;
  if (askPrice <= 0 || bidPrice < 0) return null;
  
  const spread = ((askPrice - bidPrice) / askPrice) * 100;
  if (!isFinite(spread)) return null;
  
  return Number(spread.toFixed(2));
}

/**
 * Converts SFL amount to target currency (USD, BRL, EUR, etc.) given the exchange rate.
 * Uses deterministic 4-decimal precision for crypto/token values.
 */
export function convertSflToCurrency(sflAmount: number | null | undefined, rate: number | null | undefined): number {
  if (!sflAmount || isNaN(sflAmount) || sflAmount < 0 || !rate || isNaN(rate) || rate < 0) return 0;
  return Number((sflAmount * rate).toFixed(4));
}

/**
 * Converts target currency amount to SFL given the exchange rate.
 * Protects against division by zero.
 */
export function convertCurrencyToSfl(currencyAmount: number | null | undefined, rate: number | null | undefined): number {
  if (!currencyAmount || isNaN(currencyAmount) || currencyAmount < 0 || !rate || isNaN(rate) || rate <= 0) return 0;
  return Number((currencyAmount / rate).toFixed(4));
}

/**
 * Computes net proceeds in SFL after deducting island tax rate.
 */
export function calculateNetProceeds(grossSfl: number | null | undefined, taxRate: number | null | undefined): number {
  if (!grossSfl || isNaN(grossSfl) || grossSfl <= 0) return 0;
  const safeTax = (taxRate !== undefined && taxRate !== null && !isNaN(taxRate) && taxRate >= 0 && taxRate <= 1) ? taxRate : 0;
  return Number((grossSfl * (1 - safeTax)).toFixed(4));
}

