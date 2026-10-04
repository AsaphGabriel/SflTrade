import re

# 1. PriceChartModal
path = 'src/components/PriceChartModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('flowerPriceUsd = 0.05, \n   \n  selectedCurrency', 'flowerPriceUsd = 0.05, \n  flowerPrice = 0.05, \n  selectedCurrency')
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 2. useAuthSync.ts
path = 'src/hooks/useAuthSync.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('subscription = onAuthStateChange(async (event: string, session: { user: User } | null) => {', 'subscription = onAuthStateChange(async (event: string, session: any) => {')
code = code.replace('const currentUser = session?.user || null;\n      setUser(currentUser as User | null);', 'const currentUser = session?.user || null;\n      setUser(currentUser as any);')
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 3. useMarketData.ts
path = 'src/hooks/useMarketData.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('const { farmData, setFarmData, searchFarm }', 'const { farmData, searchFarm }')
code = code.replace('currencyRates[selectedCurrency]', 'currencyRates[selectedCurrency as keyof typeof currencyRates]')
code = code.replace('nftMarketData?.byName?.[item.nome]', '(nftMarketData?.byName as Record<string, any>)?.[item.nome]')
code = code.replace('nftMarketData?.byName?.[item.nome.toLowerCase()]', '(nftMarketData?.byName as Record<string, any>)?.[item.nome.toLowerCase()]')
code = code.replace('marketData[item.nome]', '(marketData as Record<string, any>)[item.nome]')
code = code.replace('marketData[Object.keys(marketData).find((k: string) => k.toLowerCase() === item.nome.toLowerCase())]', '(marketData as Record<string, any>)[Object.keys(marketData).find((k: string) => k.toLowerCase() === item.nome.toLowerCase()) as string]')
code = code.replace('updateTransactionInCloud(user.id, txId, Number(newCotacaoUsd), newTotalUsd)', 'updateTransactionInCloud(user.id, txId as string, Number(newCotacaoUsd), newTotalUsd)')
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 4. api.ts
path = 'src/services/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('let source = null;\n', '')
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 5. syncService.ts
path = 'src/services/syncService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('islandTaxMap[localSettings.selectedIsland]', 'islandTaxMap[localSettings.selectedIsland as keyof typeof islandTaxMap]')
code = code.replace('islandTaxMap[settings.selectedIsland]', 'islandTaxMap[settings.selectedIsland as keyof typeof islandTaxMap]')
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed the remaining type/unused variables")
