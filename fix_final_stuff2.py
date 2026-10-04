import re

# 1. useAuthSync.ts
path = 'src/hooks/useAuthSync.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('subscription = onAuthStateChange(async (event: string, session: any) => {', 'subscription = onAuthStateChange(async (_event: string, session: any) => {')
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# 2. api.ts
path = 'src/services/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# I need to restore `let source = null;` just above where it is used. Or `let source = 'official';`
# Let's search where `source = 'official'` is
code = code.replace("source = 'official';", "let source = 'official';")
# Then further down `source = 'public'` will reuse it. Wait, `source` scope.
# Let's read `api.ts` around `source = 'official';`
