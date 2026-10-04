import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Remove the broken dict completely
code = re.sub(r"  '24h': null,\n  '7D': null,\n  '30D': null,\n  '90D': null\n\};\n*", '', code)
code = re.sub(r"  '24h': null,\s*'7D': null,\s*'30D': null,\s*'90D': null\s*};\s*", '', code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed syntax error")
