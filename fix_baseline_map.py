import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace byName logic in 24h
block_24 = """
      if (!rawError && Array.isArray(rawHistory) && rawHistory.length > 0) {
        const byName: Record<string, typeof rawHistory> = {};
        rawHistory.forEach((r) => {
          const n = r.name || '';
          if (!byName[n]) byName[n] = [];
          byName[n].push(r);
        });

        Object.entries(byName).forEach(([nftName, rows]) => {
"""
new_block_24 = """
      if (!rawError && Array.isArray(rawHistory) && rawHistory.length > 0) {
        const byName: Record<string, typeof rawHistory> = {};
        rawHistory.forEach((r) => {
          const key = `${r.collection || ''}_${r.name || ''}`;
          if (!byName[key]) byName[key] = [];
          byName[key].push(r);
        });

        Object.entries(byName).forEach(([nftName, rows]) => {
"""
code = code.replace(block_24.strip(), new_block_24.strip())

# Replace daily metrics
block_daily = """
      if (!dailyError && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
        const byName: Record<string, typeof dailyMetrics> = {};
        dailyMetrics.forEach((r) => {
          const n = r.name || '';
          if (!byName[n]) byName[n] = [];
          byName[n].push(r);
        });

        Object.entries(byName).forEach(([nftName, rows]) => {
"""
new_block_daily = """
      if (!dailyError && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
        const byName: Record<string, typeof dailyMetrics> = {};
        dailyMetrics.forEach((r) => {
          const key = `${r.collection || ''}_${r.name || ''}`;
          if (!byName[key]) byName[key] = [];
          byName[key].push(r);
        });

        Object.entries(byName).forEach(([nftName, rows]) => {
"""
code = code.replace(block_daily.strip(), new_block_daily.strip())

# Replace the currentNftList mapping
block_map = """
  currentNftList.forEach((nft) => {
    const currentPrice = Number(nft.floor || nft.currentPrice || 0);
    const nftName = String(nft.displayName || nft.name || '');
    if (!currentPrice || currentPrice <= 0 || !nftName) return;
    
    const basePrice = baselineMap[nftName] || baselineMap[nftName.replace(' (Wearable)', '')];
"""
new_block_map = """
  currentNftList.forEach((nft) => {
    const currentPrice = Number(nft.floor || nft.currentPrice || 0);
    const rawName = String(nft.name || '');
    const col = String(nft.collection || '');
    const key = `${col}_${rawName}`;
    
    if (!currentPrice || currentPrice <= 0 || !rawName) return;
    
    const basePrice = baselineMap[key];
"""
code = code.replace(block_map.strip(), new_block_map.strip())

# Update fetchNftHistory to use collection filter instead of ignoring it
query_1 = """
      let query = supabase
        .from('nft_price_history')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
        
      if (nftName) {
        query = (query as any).eq('name', nftName) as any;
      } else {
        query = (query as any).eq('nft_id', Number(nftId as any)) as any;
      }
"""
new_query_1 = """
      let query = supabase
        .from('nft_price_history')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
        
      if (nftName) {
        // Handle '(Wearable)' suffix if present
        const cleanName = String(nftName).replace(' (Wearable)', '');
        const col = String(nftName).includes('(Wearable)') ? 'wearables' : 'collectibles';
        query = (query as any).eq('name', cleanName).eq('collection', col) as any;
      } else {
        query = (query as any).eq('nft_id', Number(nftId as any)) as any;
      }
"""
code = code.replace(query_1.strip(), new_query_1.strip())

query_2 = """
      let query = supabase
        .from('v_nft_daily_metrics')
        .select('*')
        .gte('day', dateStr)
        .order('day', { ascending: true });
        
      if (nftName) {
        query = (query as any).eq('name', nftName) as any;
      } else {
        query = (query as any).eq('nft_id', Number(nftId as any)) as any;
      }
"""
new_query_2 = """
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
"""
code = code.replace(query_2.strip(), new_query_2.strip())

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Baseline logic mapped by collection + name!")
