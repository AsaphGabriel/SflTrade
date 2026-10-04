import re

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(': res)}', ': res as any)}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed App MoverItem 2")
