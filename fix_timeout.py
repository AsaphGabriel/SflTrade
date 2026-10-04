import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace withTimeout definition to be generic
old_timeout = r"export function withTimeout\(promise: Promise<unknown>, ms: number = 3000\): Promise<unknown> \{"
new_timeout = "export function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {"
code = re.sub(old_timeout, new_timeout, code)

# Remove `as Record<string, unknown>` type casting madness on arrays and queries
code = code.replace("data.map((d: Record<string, unknown>)", "data.map((d: any)")
code = code.replace("rawHistory.forEach((r: Record<string, unknown>)", "rawHistory.forEach((r: any)")
code = code.replace("dailyMetrics.forEach((r: Record<string, unknown>)", "dailyMetrics.forEach((r: any)")
code = code.replace("(r: Record<string, unknown>)", "(r: any)")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Done withTimeout fix")
