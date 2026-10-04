import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# I will just revert the "(await " part and cast `withTimeout`'s return type differently if needed.
# Actually I can just cast the generic in withTimeout. It is: `withTimeout<any>(...)`!
# That's much cleaner!

# Undo the broken `(await`
code = code.replace('const { data, error } = (await withTimeout(', 'const { data, error } = await withTimeout<any>(')
code = code.replace('const { data, error } = (await withTimeout<any>(', 'const { data, error } = await withTimeout<any>(')

# But wait, there are also the `) as any;` that I tried to append? No, they failed to append.
# Let's check for any stray `(await`
code = code.replace('(await withTimeout', 'await withTimeout')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed historyService syntax properly")
