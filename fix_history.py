import re

with open('src/services/historyService.ts', 'r') as f:
    text = f.read()

# Keys
text = text.replace('keysToRemove: any[]', 'keysToRemove: string[]')
text = text.replace('k: any) => localStorage', 'k: string) => localStorage')

# Caches
text = text.replace('setLocalCache(key: string, data: any)', 'setLocalCache(key: string, data: unknown)')
text = text.replace('marketData: Record<string, any> = {}', 'marketData: Record<string, number> = {}')
text = text.replace('cleanResources: Record<string, any> = {}', 'cleanResources: Record<string, number> = {}')
text = text.replace('([key, val]: any)', '([key, val])')

# Nft List
text = text.replace('nftList: any[] = []', 'nftList: NftItem[] = []')
text = text.replace('nftMarketList: any[] = []', 'nftMarketList: NftItem[] = []')

with open('src/services/historyService.ts', 'w') as f:
    f.write(text)
