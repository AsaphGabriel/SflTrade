import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(".select('name, floor_sfl, timestamp')", ".select('name, collection, floor_sfl, timestamp')")
code = code.replace(".select('name, day, avg_floor_sfl')", ".select('name, collection, day, avg_floor_sfl')")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("selects updated!")
