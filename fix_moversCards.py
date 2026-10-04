import re

path = 'src/components/MarketMoversCards.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
code = code.replace(
    "import { fetchMarketMovers, fetchNftMarketMovers } from '../services/historyService';",
    "import { fetchMarketMovers, fetchNftMarketMovers } from '../services/historyService';\nimport { MoverItem, MarketMoversResult } from '../utils/marketMath';"
)

# 2. Interfaces
code = re.sub(r'export interface MarketMoverItem \{[\s\S]*?\}', '', code)
code = re.sub(r'export interface MarketMoversData \{[\s\S]*?\}', '', code)

# 3. Replace MoverListCard Props
code = code.replace('items: MarketMoverItem[];', 'items: MoverItem[];')
code = code.replace('onSelectResource?: (resourceName: string, meta: MarketMoverItem | null) => void;', 'onSelectResource?: (resourceName: string, meta: MoverItem | null) => void;')
code = code.replace('emoji: string;', '')

# 4. Remove emoji usage in MoverListCard
code = code.replace('{emoji}', '')
code = code.replace('<span className="text-lg"></span>', '')

# 5. Fix MarketMoversCards state
code = code.replace('useState<MarketMoversData>({ topGainers: [], topLosers: [], hasData: false });', 'useState<MarketMoversResult>({ topGainers: [], topLosers: [], hasData: false });')

# 6. Fix MarketMoverItem usage in components
code = code.replace('MarketMoverItem', 'MoverItem')

# 7. Remove emoji from MarketMoversCards main title
code = code.replace('<span className="text-lg">📈</span>', '')

# 8. Update timeframes logic to use actualTimeframeLabel
code = code.replace('const { topGainers = [], topLosers = [] } = moversData;', 'const { topGainers = [], topLosers = [], actualTimeframeLabel } = moversData;')
code = code.replace('timeframe={timeframe}', 'timeframe={actualTimeframeLabel || timeframe}')

# 9. Clean up dynamic tailwind classes in MoverListCard
# MoverListCard has colorClass = isGainers ? 'emerald' : 'rose';
color_replacement = """  const isGainers = type === 'gainers';
  const colorText = isGainers ? 'text-emerald-400' : 'text-rose-400';
  const colorBorder = isGainers ? 'border-emerald-500/25' : 'border-rose-500/25';
  const colorHoverBorder = isGainers ? 'hover:border-emerald-500/40' : 'hover:border-rose-500/40';
  const colorBgBadge = isGainers ? 'bg-emerald-500/15' : 'bg-rose-500/15';
  const colorBorderBadge = isGainers ? 'border-emerald-500/30' : 'border-rose-500/30';
  const colorTextBadge = isGainers ? 'text-emerald-300' : 'text-rose-300';
  const colorHoverText = isGainers ? 'group-hover:text-emerald-300' : 'group-hover:text-rose-300';
  const hoverCardBorder = isGainers ? 'hover:border-emerald-500/50' : 'hover:border-rose-500/50';"""

code = re.sub(r'const isGainers = type === \'gainers\';\s*const colorClass = isGainers \? \'emerald\' : \'rose\';', color_replacement, code)

# Apply classes
code = re.sub(r'bg-slate-800/60 border border-\$\{colorClass\}-500/25 hover:border-\$\{colorClass\}-500/40', r'bg-slate-800/60 border ${colorBorder} ${colorHoverBorder}', code)
code = re.sub(r'text-\$\{colorClass\}-400 tracking-wide', r'${colorText} tracking-wide', code)
code = re.sub(r'text-\[10px\] font-bold text-\$\{colorClass\}-300 bg-\$\{colorClass\}-500/15 border border-\$\{colorClass\}-500/30', r'text-[10px] font-bold ${colorTextBadge} ${colorBgBadge} border ${colorBorderBadge}', code)
code = re.sub(r'group-hover:text-\$\{colorClass\}-300', r'${colorHoverText}', code)
code = re.sub(r'hover:border-\$\{colorClass\}-500/50', r'${hoverCardBorder}', code)
code = re.sub(r'text-\$\{colorClass\}-400 bg-\$\{colorClass\}-500/15 border-\$\{colorClass\}-500/30', r'${colorText} ${colorBgBadge} ${colorBorderBadge}', code)

code = code.replace('emoji="🚀"', '')
code = code.replace('emoji="📉"', '')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Done MarketMoversCards refactoring")
