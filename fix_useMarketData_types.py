import re

with open('src/hooks/useMarketData.ts', 'r') as f:
    text = f.read()

# Inject import
text = text.replace("import { t } from '../i18n';", "import { t } from '../i18n';\nimport { Transaction, PortfolioItem } from '../types/models';")

# Fix transactions.forEach
text = text.replace('transactions.forEach((t: any)', 'transactions.forEach((t: Transaction)')
text = text.replace('handleTransaction = useCallback((nuevaTransacao: Record<string, any>)', 'handleTransaction = useCallback((nuevaTransacao: Transaction)')
text = text.replace('setTransactions((prev: any[])', 'setTransactions((prev: Transaction[])')
text = text.replace('transactions.find((t: any)', 'transactions.find((t: Transaction)')
text = text.replace('prev.map((t: any)', 'prev.map((t: Transaction)')

with open('src/hooks/useMarketData.ts', 'w') as f:
    f.write(text)
