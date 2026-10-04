import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('(await withTimeout(query as any) as any;', '(await withTimeout(query as any)) as any;')
code = code.replace('    3000\n  )) as any;\n    );', '    3000\n  )) as any;')
code = code.replace('    3000\n  )) as any;\n      );', '    3000\n  )) as any;')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Syntax fixed")
