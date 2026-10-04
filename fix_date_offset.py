import re
path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('startDate.setDate(startDate.getDate() - days - 1);', 'startDate.setDate(startDate.getDate() - days);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("startDate offset fixed!")
