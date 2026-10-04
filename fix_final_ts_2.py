import re

# 1. MarketMoversCards.tsx
path = 'src/components/MarketMoversCards.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('emoji,\n', '')
code = code.replace('item.resource || ', '')
code = code.replace('item.nft_id || item.id', 'item.nft_id')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 2. i18n.ts
path = 'src/i18n.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('text = text.replace(`{${p}}`, params[p]);', 'text = text.replace(`{${p}}`, String(params[p]));')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 3. authService.ts
path = 'src/services/authService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('password,', 'password: password || "",')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 4. historyService.ts
path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('let timeoutId: Record<string, any>;', 'let timeoutId: any;')
code = code.replace('const sum = matches.reduce((acc: Record<string, any>, curr: Record<string, any>) => acc + curr.p, 0);', 'const sum = matches.reduce((acc: number, curr: any) => acc + curr.p, 0);')
code = code.replace('const { data, error } = await withTimeout(', 'const { data, error } = (await withTimeout(')
code = code.replace('    3000\n  );', '    3000\n  )) as any;')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed second round of TS errors")
