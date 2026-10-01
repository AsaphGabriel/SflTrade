import re

with open('src/components/TransactionModal.tsx', 'r') as f:
    text = f.read()

# Props Interface
props_interface = """
import { NftItem } from '../services/historyService';
import { Transaction, PortfolioItem } from '../types/models';

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  tipoVendaBuy: 'buy' | 'sell';
  recursoPreselecionado?: string;
  portfolioData?: PortfolioItem[];
  preFilledData?: { unitPrice?: number; qty?: number; nft_id?: string | number; boost_text?: string; isNft?: boolean };
  currentLang?: string;
  nftMarketData?: { list?: NftItem[]; byName?: Record<string, NftItem> };
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen, onClose, onSave, tipoVendaBuy = 'buy', recursoPreselecionado = '', portfolioData = [],
  preFilledData = {}, currentLang = 'en', nftMarketData = { list: [] }
}) => {
"""

text = re.sub(r'const TransactionModal = \(\{[\s\S]*?\}\s*:\s*any\) => \{', props_interface.strip() + " {", text)

# @ts-ignore
text = text.replace('// @ts-ignore\nimport React', 'import React')
text = text.replace('// @ts-ignore\n', '')

# Helper functions
text = text.replace('getItemIcon(itemName: any)', 'getItemIcon(itemName: string)')
text = text.replace('formatarPreco(valor: any)', 'formatarPreco(valor: number)')

# Handlers
text = text.replace('handleSelectResource = useCallback((nomeRecurso: any, currentQty: any = \'\')', 'handleSelectResource = useCallback((nomeRecurso: string, currentQty: string | number = \'\')')
text = text.replace('const handleClickOutside = (event: any)', 'const handleClickOutside = (event: MouseEvent)')
text = text.replace('handleQuantityChange = (val: any)', 'handleQuantityChange = (val: string)')
text = text.replace('handleUnitPriceChange = (val: any)', 'handleUnitPriceChange = (val: string)')
text = text.replace('handleTotalPriceChange = (val: any)', 'handleTotalPriceChange = (val: string)')
text = text.replace('handleSubmit = (e: any)', 'handleSubmit = (e: React.FormEvent)')

# Loops
text = text.replace('(p: any)', '(p: PortfolioItem)')
text = text.replace('(item: any)', '(item: PortfolioItem)')
text = text.replace('.map((item: any)', '.map((item: PortfolioItem)')
text = text.replace('.map((item: PortfolioItem) => item.nome)', '.map((item: PortfolioItem) => item.nome)')
text = text.replace('(n: any)', '(n: NftItem)')
text = text.replace('(r: any)', '(r: string)')
text = text.replace('(rec: any)', '(rec: string)')

# Event listeners
text = text.replace('onChange={(e: any)', 'onChange={(e: React.ChangeEvent<HTMLInputElement>)')

# Arrays
text = text.replace('let listaBase: any[] = [];', 'let listaBase: string[] = [];')

# Try/catch
text = text.replace('catch (err: any)', 'catch (err)')


with open('src/components/TransactionModal.tsx', 'w') as f:
    f.write(text)

