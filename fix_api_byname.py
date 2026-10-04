import re

path = 'src/services/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix byName population
old_block = """    allBoosts.forEach((nft: { name?: string; id?: string | number; [key: string]: unknown }) => {
      if (nft.name) {
        byName[nft.name] = nft;
        if (nft.displayName && nft.displayName !== nft.name) {
          byName[String(nft.displayName)] = nft;
        }
      }
      if (nft.id !== undefined) {
        byId[nft.id] = nft;
      }
    });"""

new_block = """    allBoosts.forEach((nft: { name?: string; id?: string | number; displayName?: string; [key: string]: unknown }) => {
      if (nft.displayName) {
        byName[nft.displayName] = nft;
        if (nft.displayName !== nft.name && nft.name && !byName[nft.name]) {
           // Só mapeia o name original se não existir conflito direto, mas prefere displayName
           // No caso do Parsnip, 'Parsnip' ficará pro collectible (que seta byName['Parsnip'])
           // e 'Parsnip (Wearable)' ficará pro wearable.
           byName[nft.name] = nft;
        }
      } else if (nft.name) {
        byName[nft.name] = nft;
      }
      if (nft.id !== undefined) {
        byId[`${nft.collection || 'unknown'}_${nft.id}`] = nft;
      }
    });"""

if old_block in code:
    code = code.replace(old_block, new_block)
else:
    print("WARNING: Could not find exact old_block text")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("api.ts byName fixed!")
