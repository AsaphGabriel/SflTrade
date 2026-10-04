import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix fetchNftHistory
# The current code in historyService.ts:
#       let query = supabase
#         .from('nft_price_history')
#         .select('*')
#         .eq('nft_id', Number(nftId as any))
#         .gte('timestamp', startDate.toISOString())
#         .order('timestamp', { ascending: true });
#       if (nftName) query = (query as any).eq('name', nftName);

code = re.sub(
    r"let query = supabase\s*\.from\('nft_price_history'\)\s*\.select\('\*'\)\s*\.eq\('nft_id', Number\(nftId as any\)\)\s*\.gte\('timestamp', startDate\.toISOString\(\)\)\s*\.order\('timestamp', \{ ascending: true \}\);\s*if \(nftName\) query = \(query as any\)\.eq\('name', nftName\);",
    """let query = supabase
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
      }""",
    code
)

# Also for v_nft_daily_metrics
code = re.sub(
    r"let query = supabase\s*\.from\('v_nft_daily_metrics'\)\s*\.select\('\*'\)\s*\.eq\('nft_id', Number\(nftId as any\)\)\s*\.gte\('day', dateStr\)\s*\.order\('day', \{ ascending: true \}\);\s*if \(nftName\) query = \(query as any\)\.eq\('name', nftName\);",
    """let query = supabase
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
      }""",
    code
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("fetchNftHistory replaced successfully!")
