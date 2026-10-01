import re

with open('src/components/PriceChartModal.tsx', 'r') as f:
    content = f.read()

# Replace the component signature
sig = "export interface PriceChartProps {\n  resourceId: any;\n  isToken?: boolean;\n  flowerPriceUsd?: number;\n  flowerPrice?: number;\n  selectedCurrency?: string;\n  currentLang?: string;\n  onClose: () => void;\n}\n\nconst PriceChartModal: React.FC<PriceChartProps> = ({ resourceId, isToken = false, flowerPriceUsd = 0.05, flowerPrice = 0.05, selectedCurrency = 'usd', currentLang = 'en', onClose }) => {"
content = re.sub(r'const PriceChartModal = \(\{.*?\}: any\) => \{', sig, content, flags=re.DOTALL)

# Replace internal any
content = content.replace('let data: any[] = [];', 'let data: any[] = [];')

# Replace SVG path gen map (d: any, i: any)
content = content.replace('(d: any, i: any)', '(d: any, i: number)')
content = content.replace('(d: any)', '(d: any)')

with open('src/components/PriceChartModal.tsx', 'w') as f:
    f.write(content)
