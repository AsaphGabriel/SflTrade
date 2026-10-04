import re

path = 'public/sw.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(r"const CACHE_NAME = 'sfl-tracker-v1\.9\.\d+';", "const CACHE_NAME = 'sfl-tracker-v1.9.5';", code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

path_pkg = 'package.json'
with open(path_pkg, 'r', encoding='utf-8') as f:
    code_pkg = f.read()

code_pkg = re.sub(r'"version": "1\.2\.\d+"', '"version": "1.2.6"', code_pkg)

with open(path_pkg, 'w', encoding='utf-8') as f:
    f.write(code_pkg)

print("SW bumped!")
