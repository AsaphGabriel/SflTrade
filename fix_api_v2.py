import re

with open('src/services/api.ts', 'r') as f:
    text = f.read()

text = text.replace('export function getCachedData(key: any)', 'export function getCachedData(key: string)')
text = text.replace('export function setCachedData(key: any, data: any)', 'export function setCachedData(key: string, data: unknown)')
text = text.replace('catch (e: any)', 'catch (e)')
text = text.replace('catch (err: any)', 'catch (err)')
text = text.replace('export async function fetchWithFallback(url: any, options: any = {})', 'export async function fetchWithFallback(url: string, options: RequestInit & { timeout?: number } = {})')
text = text.replace('async function fetchWithRetry(url: any, options: any = {})', 'async function fetchWithRetry(url: string, options: RequestInit & { timeout?: number } = {})')
text = text.replace('fetchFarmDataSmart({ farmId, apiKey = \'\', forceRefresh = false }: any)', 'fetchFarmDataSmart({ farmId, apiKey = \'\', forceRefresh = false }: { farmId: number | string, apiKey?: string, forceRefresh?: boolean })')

# NftItem types
text = text.replace('.filter((item: any)', '.filter((item: Record<string, any>)')
text = text.replace('.map((item: any)', '.map((item: Record<string, any>)')
text = text.replace('let list: any = [];', 'let list: Record<string, any>[] = [];')
text = text.replace('list.forEach((nft: any)', 'list.forEach((nft: Record<string, any>)')
text = text.replace('let byName: any = {};', 'let byName: Record<string, any> = {};')
text = text.replace('let byId: any = {};', 'let byId: Record<string, any> = {};')

text = text.replace('Object.entries(f.wardrobe).forEach(([wName, qty]: any)', 'Object.entries(f.wardrobe).forEach(([wName, qty])')
text = text.replace('Object.entries(f.inventory).forEach(([itemName, rawQty]: any)', 'Object.entries(f.inventory).forEach(([itemName, rawQty])')
text = text.replace('Object.entries(f.collectibles).forEach(([collName, items]: any)', 'Object.entries(f.collectibles).forEach(([collName, items])')

text = text.replace('find((k: any)', 'find((k)')

with open('src/services/api.ts', 'w') as f:
    f.write(text)

