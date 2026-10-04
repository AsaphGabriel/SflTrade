import re

def process_file(path, logic_function):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            code = f.read()
        code = logic_function(code)
        # Remove any lingering ts-ignore
        code = re.sub(r'^\s*//\s*@ts-ignore\s*\n', '', code, flags=re.MULTILINE)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(code)
    except FileNotFoundError:
        pass

def fix_useAuthSync(code):
    code = code.replace("JSON.parse(localStorage.getItem('sfl_transactions'))", "JSON.parse(localStorage.getItem('sfl_transactions') || '[]')")
    code = code.replace("setUser(currentUser);", "setUser(currentUser as User | null);")
    code = code.replace("subscription = onAuthStateChange", "subscription = onAuthStateChange")
    return code

def fix_useMarketPrices(code):
    code = code.replace('taxasBase[selectedIsland]', 'taxasBase[selectedIsland as keyof typeof taxasBase]')
    code = code.replace('currencyRates[selectedCurrency]', 'currencyRates[selectedCurrency as keyof typeof currencyRates]')
    return code

def fix_syncService(code):
    code = code.replace('islandTaxMap[selectedIsland]', 'islandTaxMap[selectedIsland as keyof typeof islandTaxMap]')
    code = code.replace('export const calculateAverageCost =', 'export const calculateAverageCost =')
    # Let's just remove any @ts-ignore
    return code

def fix_historyService(code):
    code = code.replace('query = (query as any).eq', 'query = (query as any).eq')
    return code

def fix_i18n(code):
    return code

def fix_api(code):
    return code

def fix_useMarketData(code):
    code = code.replace('const [farmProfile, setFarmProfile] = useState(null);', 'const [farmProfile, setFarmProfile] = useState<any>(null);')
    code = code.replace('setFarmProfile(profileData);', 'setFarmProfile(profileData as any);')
    code = code.replace('farmProfile.experience', 'farmProfile?.experience')
    code = code.replace('farmProfile.coins', 'farmProfile?.coins')
    code = code.replace('farmProfile.previousFreeMintAt', 'farmProfile?.previousFreeMintAt')
    code = code.replace('farmProfile.mints', 'farmProfile?.mints')
    code = code.replace('farmProfile.farmId', 'farmProfile?.farmId')
    return code

process_file('src/hooks/useAuthSync.ts', fix_useAuthSync)
process_file('src/hooks/useMarketPrices.ts', fix_useMarketPrices)
process_file('src/services/syncService.ts', fix_syncService)
process_file('src/services/historyService.ts', fix_historyService)
process_file('src/i18n.ts', fix_i18n)
process_file('src/services/api.ts', fix_api)
process_file('src/hooks/useMarketData.ts', fix_useMarketData)

print("ts-ignores removed!")
