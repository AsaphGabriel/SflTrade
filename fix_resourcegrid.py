import re

with open('src/components/ResourceGrid.tsx', 'r') as f:
    text = f.read()

# Props Interface
props_interface = """
import { NftItem } from '../services/historyService';

export interface ResourceGridProps {
  data: Record<string, number>;
  nftData?: { items?: NftItem[]; byName?: Record<string, NftItem> };
  onOpenBuy?: (name: string, meta?: any) => void;
  onOpenSell?: (name: string, meta?: any) => void;
  currentLang?: string;
  isDev?: boolean;
}

const ResourceGrid: React.FC<ResourceGridProps> = ({ data, nftData, onOpenBuy, onOpenSell, currentLang = 'en', isDev = false }) => {
"""

text = re.sub(r'const ResourceGrid = \(\{.*?\}\s*:\s*any\) => \{', props_interface.strip(), text, flags=re.DOTALL)

# e: React.MouseEvent
text = text.replace('(e: any)', '(e: React.MouseEvent)')

# item: string
text = text.replace('(item: any)', '(item: string)')
text = text.replace('.sort((a: any, b: any)', '.sort((a: string, b: string)')

# nft: any
text = text.replace('(nft: any)', '(nft: any)') # wait, nft could be typed. let's just make it `(nft: NftItem)`
text = text.replace('(nft: any)', '(nft: any)')

text = text.replace('const nftsToRender = (nftData?.items || []).filter((nft: any)', 'const nftsToRender = (nftData?.items || []).filter((nft: NftItem)')
text = text.replace('{nftsToRender.map((nft: any)', '{nftsToRender.map((nft: NftItem)')
text = text.replace('let itens = grupos[cat.id]', 'let itens: string[] = grupos[cat.id]')

with open('src/components/ResourceGrid.tsx', 'w') as f:
    f.write(text)

