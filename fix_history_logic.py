import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix fetchMarketMovers
# Instead of pastRows and closest = pastRows[pastRows.length - 1], use futureRows
code = code.replace(
    'const pastRows = rows.filter(r => (r.day || \'\') <= targetDay);\n          if (pastRows.length > 0) {\n            const closest = pastRows[pastRows.length - 1];',
    'const futureRows = rows.filter(r => (r.day || \'\') >= targetDay);\n          if (futureRows.length > 0) {\n            const closest = futureRows[0];'
)

# Fix fetchNftMarketMovers
# Change select('nft_id, floor_sfl, timestamp') to select('name, floor_sfl, timestamp')
code = code.replace(
    ".select('nft_id, floor_sfl, timestamp')",
    ".select('name, floor_sfl, timestamp')"
)
# Change select('nft_id, day, avg_floor_sfl') to select('name, day, avg_floor_sfl')
code = code.replace(
    ".select('nft_id, day, avg_floor_sfl')",
    ".select('name, day, avg_floor_sfl')"
)

# Now we need to change grouping from nft_id to name
# baselineMap should be Record<string, number> instead of Record<number, number>
code = code.replace('let baselineMap: Record<number, number> = {};', 'let baselineMap: Record<string, number> = {};')

# In 24h block of fetchNftMarketMovers:
block_24 = """
      if (!rawError && Array.isArray(rawHistory) && rawHistory.length > 0) {
        const byId: Record<number, typeof rawHistory> = {};
        rawHistory.forEach((r) => {
          if (!byId[r.nft_id]) byId[r.nft_id] = [];
          byId[r.nft_id].push(r);
        });

        Object.entries(byId).forEach(([idStr, rows]) => {
          const nftId = Number(idStr);
"""
new_block_24 = """
      if (!rawError && Array.isArray(rawHistory) && rawHistory.length > 0) {
        const byName: Record<string, typeof rawHistory> = {};
        rawHistory.forEach((r) => {
          const n = r.name || '';
          if (!byName[n]) byName[n] = [];
          byName[n].push(r);
        });

        Object.entries(byName).forEach(([nftName, rows]) => {
"""
code = code.replace(block_24.strip(), new_block_24.strip())
code = code.replace('baselineMap[nftId] = Number(closest.floor_sfl);', 'baselineMap[nftName] = Number(closest.floor_sfl);')

# In daily block of fetchNftMarketMovers:
block_daily = """
      if (!dailyError && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
        const byId: Record<number, typeof dailyMetrics> = {};
        dailyMetrics.forEach((r) => {
          const nid = r.nft_id || 0;
          if (!byId[nid]) byId[nid] = [];
          byId[nid].push(r);
        });

        Object.entries(byId).forEach(([idStr, rows]) => {
          const nftId = Number(idStr);
"""
new_block_daily = """
      if (!dailyError && Array.isArray(dailyMetrics) && dailyMetrics.length > 0) {
        const byName: Record<string, typeof dailyMetrics> = {};
        dailyMetrics.forEach((r) => {
          const n = r.name || '';
          if (!byName[n]) byName[n] = [];
          byName[n].push(r);
        });

        Object.entries(byName).forEach(([nftName, rows]) => {
"""
code = code.replace(block_daily.strip(), new_block_daily.strip())
code = code.replace('baselineMap[nftId] = Number(closest.avg_floor_sfl);', 'baselineMap[nftName] = Number(closest.avg_floor_sfl);')

# The currentNftList mapping
block_map = """
  currentNftList.forEach((nft) => {
    const currentPrice = Number(nft.floor || nft.currentPrice || 0);
    const nftId = Number(nft.nft_id || nft.id || 0);
    if (!currentPrice || currentPrice <= 0 || !nftId) return;
    
    const basePrice = baselineMap[nftId];
"""
new_block_map = """
  currentNftList.forEach((nft) => {
    const currentPrice = Number(nft.floor || nft.currentPrice || 0);
    const nftName = String(nft.displayName || nft.name || '');
    if (!currentPrice || currentPrice <= 0 || !nftName) return;
    
    const basePrice = baselineMap[nftName] || baselineMap[nftName.replace(' (Wearable)', '')];
"""
code = code.replace(block_map.strip(), new_block_map.strip())

# Fix fetchNftHistory
# We should query strictly by name if provided, ignoring nft_id to avoid collisions
query_1 = """
      let query = supabase
        .from('nft_price_history')
        .select('*')
        .eq('nft_id', Number(nftId as any))
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
        
      if (nftName) query = (query as any).eq('name', nftName) as any;
"""
new_query_1 = """
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
code = code.replace(query_1.strip(), new_query_1.strip())

query_2 = """
      let query = supabase
        .from('v_nft_daily_metrics')
        .select('*')
        .eq('nft_id', Number(nftId as any))
        .gte('day', dateStr)
        .order('day', { ascending: true });
        
      if (nftName) query = (query as any).eq('name', nftName) as any;
"""
new_query_2 = """
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
code = code.replace(query_2.strip(), new_query_2.strip())

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("historyService logic fixed!")
