import re

with open('src/services/api.ts', 'r') as f:
    text = f.read()

text = text.replace('export function getCachedData(key: any)', 'export function getCachedData(key: string)')
text = text.replace('export function setCachedData(key: any, data: any)', 'export function setCachedData(key: string, data: unknown)')
text = text.replace('catch (e: any)', 'catch (e)')
text = text.replace('catch (err: any)', 'catch (err)')
text = text.replace('export async function fetchWithFallback(url: any, options: any = {})', 'export async function fetchWithFallback(url: string, options: RequestInit & { timeout?: number } = {})')
text = text.replace('async function fetchWithRetry(url: any, options: any = {})', 'async function fetchWithRetry(url: string, options: RequestInit & { timeout?: number } = {})')
text = text.replace('return fallbackData as any;', 'return fallbackData as unknown;')
text = text.replace('Promise<any>', 'Promise<unknown>')
text = text.replace(': any = {};', ': Record<string, unknown> = {};')
text = text.replace(': any = []', ': unknown[] = []')
text = text.replace(': any)', ': unknown)')
text = text.replace('as any', 'as unknown')
text = text.replace('let obj: any = {};', 'let obj: Record<string, number> = {};')

with open('src/services/api.ts', 'w') as f:
    f.write(text)

