import re

path = 'src/services/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("source = 'official';", "")
code = code.replace("source = 'public';", "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed unused 'source' assignments")
