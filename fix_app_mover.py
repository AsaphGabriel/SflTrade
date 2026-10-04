import re

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('useState<MarketMoverItem | null>', 'useState<MoverItem | null>')
code = code.replace('meta as MarketMoverItem', 'meta as MoverItem')
code = code.replace("import MarketMoversCards from './components/MarketMoversCards';", "import MarketMoversCards from './components/MarketMoversCards';\nimport { MoverItem } from './utils/marketMath';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed App MoverItem")
