import re

path = 'src/components/FarmDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Remove getItemEmoji function
code = re.sub(r'export function getItemEmoji\(name: string\) \{[\s\S]*?return \'📦\';\n\}', '', code)

# Remove emoji property
code = code.replace('emoji: getItemEmoji(canonicalName)', '')

# Fix any stray commas in object
code = re.sub(r'nftImage,\s*\}', 'nftImage\n        }', code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Done FarmDashboard emoji removal")
