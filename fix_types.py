import re

with open('src/services/historyService.ts', 'r') as f:
    text = f.read()

# 1. Simple replacements
text = text.replace('keysToRemove: any[]', 'keysToRemove: string[]')
text = text.replace('k: any) => localStorage', 'k: string) => localStorage')
text = text.replace('setLocalCache(key: string, data: any)', 'setLocalCache(key: string, data: unknown)')
text = text.replace('let result: any[] = [];', 'let result: HistoryPoint[] = [];')
text = text.replace('data: any = [],', 'data: HistoryPoint[] = [],')
text = text.replace('marketData: Record<string, any>', 'marketData: Record<string, number>')
text = text.replace('cleanResources: Record<string, any>', 'cleanResources: Record<string, number>')
text = text.replace('([key, val]: any)', '([key, val])')
text = text.replace('hourlyHistory.filter((h: any)', 'hourlyHistory.filter((h: HistoryPoint)')
text = text.replace('hourlyHistory.findIndex((h: any)', 'hourlyHistory.findIndex((h: HistoryPoint)')
text = text.replace('hourlyHistory.sort((a: any, b: any)', 'hourlyHistory.sort((a: HistoryPoint, b: HistoryPoint)')
text = text.replace('rawData: any[] = []', 'rawData: HistoryPoint[] = []')
text = text.replace('let buckets: any[] = [];', 'let buckets: HistoryPoint[] = [];')
text = text.replace('let rawPoints: any[] = [];', 'let rawPoints: HistoryPoint[] = [];')
text = text.replace('nftList: any[] = []', 'nftList: NftItem[] = []')
text = text.replace('nftMarketList: any[] = []', 'nftMarketList: NftItem[] = []')
text = text.replace('let variations: any[] = [];', 'let variations: { resourceId?: string; nft_id?: string; name?: string; changePct: number; latest: number; avg: number; min: number; max: number; image?: string; floor?: number }[] = [];')
text = text.replace('variations.sort((a: any, b: any)', 'variations.sort((a, b)')
text = text.replace('topGainers = variations.filter((v: any)', 'topGainers = variations.filter(v')
text = text.replace('topLosers = [...variations].filter((v: any)', 'topLosers = [...variations].filter(v')
text = text.replace('topLosers = variations.filter((v: any)', 'topLosers = variations.filter(v')

# General maps and filters that can be inferred
text = re.sub(r'\.map\(\(item: any\)', '.map(item', text)
text = re.sub(r'\.filter\(\(item: any\)', '.filter(item', text)
text = re.sub(r'\.sort\(\(a: any, b: any\)', '.sort((a, b)', text)
text = re.sub(r'\.reduce\(\(acc: any, curr: any\)', '.reduce((acc, curr)', text)
text = re.sub(r'\.map\(\(h: any\)', '.map((h: HistoryPoint)', text)
text = re.sub(r'\.filter\(\(h: any\)', '.filter((h: HistoryPoint)', text)
text = re.sub(r'\.map\(\(d: any\)', '.map((d: HistoryPoint)', text)
text = re.sub(r'\.map\(\(n: any\)', '.map((n: NftItem)', text)
text = re.sub(r'\.filter\(\(p: any\)', '.filter((p: HistoryPoint)', text)
text = re.sub(r'\.forEach\(\(r: any\)', '.forEach((r: HistoryPoint)', text)
text = re.sub(r'\.forEach\(\(item: any\)', '.forEach((item: NftItem)', text)
text = re.sub(r'\.forEach\(\(nft: any\)', '.forEach((nft: NftItem)', text)

# Object entries iterations
text = re.sub(r'Object\.entries\((.*?)\)\.forEach\(\(\[resId, rows\]: any\)', r'Object.entries(\1).forEach(([resId, rows])', text)
text = re.sub(r'Object\.entries\((.*?)\)\.forEach\(\(\[resId, price\]: any\)', r'Object.entries(\1).forEach(([resId, price])', text)
text = re.sub(r'Object\.entries\((.*?)\)\.forEach\(\(\[key, rows\]: any\)', r'Object.entries(\1).forEach(([key, rows])', text)
text = re.sub(r'Object\.entries\((.*?)\)\.forEach\(\(\[resourceId, rawCurrent\]: any\)', r'Object.entries(\1).forEach(([resourceId, rawCurrent])', text)

# Dictionaries
text = text.replace('const byRes: Record<string, any> = {};', 'const byRes: Record<string, HistoryPoint[]> = {};')
text = text.replace('const byNft: Record<string, any> = {};', 'const byNft: Record<string, HistoryPoint[]> = {};')
text = text.replace('baselineCache: Record<string, any> = {};', 'baselineCache: Record<string, HistoryPoint[]> = {};')
text = text.replace('nftBaselineCache: Record<string, any> = {', 'nftBaselineCache: Record<string, HistoryPoint[]> = {')
text = text.replace('let baselineMap: Record<string, any> = {};', 'let baselineMap: Record<string, HistoryPoint[]> = {};')

with open('src/services/historyService.ts', 'w') as f:
    f.write(text)

print("historyService.ts processed.")

with open('src/hooks/useMarketData.ts', 'r') as f:
    text = f.read()

text = text.replace('(nuevaTransacao: any)', '(nuevaTransacao: Omit<Transaction, "id" | "timestamp" | "total_usd"> & { qty?: number, unitPrice?: number })')
text = text.replace('async (txId: any, newCotacaoUsd: any)', 'async (txId: string | number, newCotacaoUsd: number | string)')
text = text.replace('transactions.find((t: any)', 'transactions.find((t: Transaction)')
text = text.replace('setTransactions((prev: any)', 'setTransactions((prev: Transaction[])')
text = text.replace('prev.map((t: any)', 'prev.map((t: Transaction)')
text = text.replace('.filter((key: any)', '.filter((key)')
text = text.replace('.map((key: any)', '.map((key)')
text = text.replace('find((k: any)', 'find((k)')

with open('src/hooks/useMarketData.ts', 'w') as f:
    f.write(text)

print("useMarketData.ts processed.")
