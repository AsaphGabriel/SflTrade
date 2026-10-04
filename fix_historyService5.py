import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('await withTimeout<any>(query as any)) as any;', 'await withTimeout<any>(query as any);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed historyService syntax extra parens")
