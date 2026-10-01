import re

with open('src/components/ResourceGrid.tsx', 'r') as f:
    text = f.read()

props_interface = """
import { NftItem } from '../services/historyService';

export interface ResourceGridProps {
  data: Record<string, number>;
  nftData?: { items?: NftItem[]; list?: NftItem[]; byName?: Record<string, NftItem> };
  onOpenBuy?: (name: string, meta?: any) => void;
  onOpenSell?: (name: string, meta?: any) => void;
  currentLang?: string;
  isDev?: boolean;
  categoryFilter?: string | null;
  onCategoryFilterChange?: (cat: string) => void;
  searchTerm?: string;
  onSearchTermChange?: (val: string) => void;
}

const ResourceGrid: React.FC<ResourceGridProps> = ({
  data,
  nftData,
  onOpenBuy,
  onOpenSell,
  currentLang = 'en',
  isDev = false,
  categoryFilter = null,
  onCategoryFilterChange,
  searchTerm: externalSearchTerm = null,
  onSearchTermChange
}) => {
"""
# Replace the component signature
text = re.sub(r"const ResourceGrid = \(\{\s*data,\s*nftData,\s*onOpenBuy,\s*onOpenSell,\s*currentLang = 'en',\s*isDev = false,\s*categoryFilter = null,\s*onCategoryFilterChange,\s*searchTerm: externalSearchTerm = null,\s*onSearchTermChange\s*\}\s*:\s*any\) => \{", props_interface.strip(), text, flags=re.DOTALL)

# React.ChangeEvent<HTMLInputElement>
text = text.replace('(e: any) => handleSearchChange(e.target.value)', '(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)')

# NftItem filtering and mapping
text = text.replace('.filter((item: any) => {', '.filter((item: NftItem) => {')
text = text.replace('.sort((a: any, b: any) => (Number(a.floor)', '.sort((a: NftItem, b: NftItem) => (Number(a.floor)')
text = text.replace('{nftsToRender.map((nft: any)', '{nftsToRender.map((nft: NftItem)')
text = text.replace('onClick={(e: any)', 'onClick={(e: React.MouseEvent)')

# Normal item string filtering
text = text.replace('.filter((item: any) => item.toLowerCase()', '.filter((item: string) => item.toLowerCase()')
text = text.replace('.sort((a: any, b: any) => (data[a]', '.sort((a: string, b: string) => (data[a]')
text = text.replace('{itens.map((item: any)', '{itens.map((item: string)')

with open('src/components/ResourceGrid.tsx', 'w') as f:
    f.write(text)

