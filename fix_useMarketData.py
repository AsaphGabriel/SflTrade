import re

with open('src/hooks/useMarketData.ts', 'r') as f:
    text = f.read()

text = text.replace('(settings: any)', '(settings: Record<string, unknown>)')
text = text.replace('(land: any)', '(land: unknown)')
text = text.replace('const estoque: Record<string, any> = {};', 'const estoque: Record<string, any> = {};') # leave this one as any for now if it's too complex
text = text.replace('transactions.forEach((t: any)', 'transactions.forEach((t: any)')
text = text.replace('.filter((key: any)', '.filter((key: string)')
text = text.replace('.map((key: any)', '.map((key: string)')
text = text.replace('find((k: any)', 'find((k: string)')
text = text.replace('handleTransaction = useCallback((nuevaTransacao: any)', 'handleTransaction = useCallback((nuevaTransacao: Record<string, any>)')
text = text.replace('setTransactions((prev: any)', 'setTransactions((prev: any[])')
text = text.replace('} catch (e: any) {}', '} catch (e) {}')
text = text.replace('updateTransactionPrice = useCallback(async (txId: any, newCotacaoUsd: any)', 'updateTransactionPrice = useCallback(async (txId: number | string, newCotacaoUsd: number | string)')
text = text.replace('transactions.find((t: any)', 'transactions.find((t: any)')
text = text.replace('prev.map((t: any)', 'prev.map((t: any)')

with open('src/hooks/useMarketData.ts', 'w') as f:
    f.write(text)
