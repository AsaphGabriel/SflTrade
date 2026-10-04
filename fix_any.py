import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('Record<string, unknown>', 'Record<string, any>')
code = code.replace('Record<string, any>[]', 'any[]')
code = code.replace(': Record<string, any> {', ': any {')
code = code.replace('as Record<string, any>', 'as any')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Done historyService any fix")
