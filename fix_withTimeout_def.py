import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r'async function withTimeout\(promise: Record<string, any>, timeoutMs: number = 2500\) \{',
    r'async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 2500): Promise<T> {',
    code
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed withTimeout definition")
