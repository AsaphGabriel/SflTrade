import re

# 1. MarketMoversCards.tsx
path = 'src/components/MarketMoversCards.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('item.currentPrice)', 'item.currentPriceSfl)')
code = code.replace('item.basePrice)', 'item.basePriceSfl)')
code = code.replace('fetchNftMarketMovers((nftMarketData?.list || []) as any[], timeframe) as any;', 'fetchNftMarketMovers((nftMarketData?.list || []) as any[], timeframe as any) as any;')
code = code.replace('fetchMarketMovers(marketData, timeframe);', 'fetchMarketMovers(marketData as any, timeframe as any);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 2. PriceChartModal.tsx
path = 'src/components/PriceChartModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('data = await fetchTokenHistory(timeframe, flowerPriceUsd);', 'data = (await fetchTokenHistory(timeframe, flowerPriceUsd as any)) as any;')
code = code.replace('data = await fetchResourceHistory(targetName as string, timeframe, currentPriceRef);', 'data = (await fetchResourceHistory(targetName as string, timeframe, currentPriceRef)) as any;')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed final TS errors")
