import re

with open('src/services/historyService.ts', 'r') as f:
    text = f.read()

# Try-catch
text = text.replace('catch (e: any)', 'catch (e)')
text = text.replace('catch (err: any)', 'catch (err)')

# calculateMovingAverage
text = text.replace('calculateMovingAverage(data: any = [], windowSize: number = 7, valueKey: string = \'price_sfl\')', 'calculateMovingAverage(data: HistoryPoint[] = [], windowSize: number = 7, valueKey: keyof HistoryPoint = \'price_sfl\')')
text = text.replace('let result: any[] = [];', 'let result: HistoryPoint[] = [];')

# aggregateHistoryByInterval
text = text.replace('aggregateHistoryByInterval(rawData: any[] = [], timeframe: string | number = \'30D\', fallbackPrice: number = 0)', 'aggregateHistoryByInterval(rawData: HistoryPoint[] = [], timeframe: string | number = \'30D\', fallbackPrice: number = 0)')
text = text.replace('let buckets: any[] = [];', 'let buckets: HistoryPoint[] = [];')
text = text.replace('let rawPoints: any[] = [];', 'let rawPoints: HistoryPoint[] = [];')

# Hourly History filtering
text = text.replace('hourlyHistory.filter((h: any)', 'hourlyHistory.filter((h: HistoryPoint)')
text = text.replace('hourlyHistory.findIndex((h: any)', 'hourlyHistory.findIndex((h: HistoryPoint)')
text = text.replace('hourlyHistory.sort((a: any, b: any)', 'hourlyHistory.sort((a: HistoryPoint, b: HistoryPoint)')

# Map/Filter items in aggregateHistoryByInterval
text = text.replace('.map((item: any) => {', '.map((item: HistoryPoint) => {')
text = text.replace('.filter((item: any) => !isNaN', '.filter((item: HistoryPoint) => !isNaN')
text = text.replace('.sort((a: any, b: any) => a.t - b.t)', '.sort((a: HistoryPoint, b: HistoryPoint) => (a.t || 0) - (b.t || 0))')
text = text.replace('.filter((item: any) => item.t >=', '.filter((item: HistoryPoint) => (item.t || 0) >=')
text = text.replace('.reduce((acc: any, curr: any)', '.reduce((acc: number, curr: HistoryPoint)')
text = text.replace('withSma30.map((item: any) => ({', 'withSma30.map((item: HistoryPoint) => ({')

# Caches
text = text.replace('const byRes: Record<string, any> = {};', 'const byRes: Record<string, HistoryPoint[]> = {};')
text = text.replace('const byNft: Record<string, any> = {};', 'const byNft: Record<string, HistoryPoint[]> = {};')
text = text.replace('baselineCache: Record<string, any> = {};', 'baselineCache: Record<string, HistoryPoint[]> = {};')
text = text.replace('nftBaselineCache: Record<string, any> = {', 'nftBaselineCache: Record<string, HistoryPoint[]> = {')
text = text.replace('let baselineMap: Record<string, any> = {};', 'let baselineMap: Record<string, number> = {};') # Note: map should be Record<string, number> because we store the floor/avg price

# Promise timeout
text = text.replace('withTimeout(promise: any, timeoutMs: number = 2500)', 'withTimeout<T>(promise: Promise<T>, timeoutMs: number = 2500): Promise<T>')
text = text.replace('new Promise((_: any, reject: any)', 'new Promise<never>((_, reject)')

# Object entries
text = text.replace('([resId, rows]: any)', '([resId, rows])')
text = text.replace('([resId, price]: any)', '([resId, price])')
text = text.replace('([key, rows]: any)', '([key, rows])')
text = text.replace('([resourceId, rawCurrent]: any)', '([resourceId, rawCurrent])')

# Market movers
text = text.replace('let variations: any[] = [];', 'let variations: { resourceId?: string; nft_id?: string; name?: string; changePct: number; latest: number; avg: number; min: number; max: number; image?: string; floor?: number }[] = [];')
text = text.replace('variations.sort((a: any, b: any)', 'variations.sort((a, b)')
text = text.replace('topGainers = variations.filter((v: any)', 'topGainers = variations.filter(v')
text = text.replace('topLosers = [...variations].filter((v: any)', 'topLosers = [...variations].filter(v')
text = text.replace('topLosers = variations.filter((v: any)', 'topLosers = variations.filter(v')

# Other maps/filters
text = text.replace('.map((h: any)', '.map((h: HistoryPoint)')
text = text.replace('.filter((h: any)', '.filter((h: HistoryPoint)')
text = text.replace('.map((d: any)', '.map((d: HistoryPoint)')
text = text.replace('.map((n: any)', '.map((n: NftItem)')
text = text.replace('.filter((p: any)', '.filter((p: HistoryPoint)')
text = text.replace('.forEach((r: any)', '.forEach((r: HistoryPoint)')
text = text.replace('.forEach((item: any)', '.forEach((item: NftItem)')
text = text.replace('.forEach((nft: any)', '.forEach((nft: NftItem)')

with open('src/services/historyService.ts', 'w') as f:
    f.write(text)

