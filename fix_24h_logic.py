import re

path = 'src/services/historyService.ts'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix 24h block in fetchMarketMovers
block_1 = """
        Object.entries(byRes).forEach(([resId, rows]) => {
          let closest = rows[0];
          let minDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTimeMs);
          for (const row of rows) {
            const diff = Math.abs(new Date(row.timestamp).getTime() - targetTimeMs);
            if (diff < minDiff) {
              minDiff = diff;
              closest = row;
            }
          }
          const closestAge = nowMs - new Date(closest.timestamp).getTime();
          if (closest && closest.price_sfl > 0 && closestAge >= minAgeMs) {
            baselineMap[resId] = Number(closest.price_sfl);
            if (closestAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - closestAge;
          }
        });
"""
new_block_1 = """
        Object.entries(byRes).forEach(([resId, rows]) => {
          const futureRows = rows.filter(r => new Date(r.timestamp).getTime() >= targetTimeMs);
          if (futureRows.length > 0) {
            const closest = futureRows[0];
            const closestAge = nowMs - new Date(closest.timestamp).getTime();
            if (closest.price_sfl > 0) {
              baselineMap[resId] = Number(closest.price_sfl);
              if (closestAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - closestAge;
            }
          }
        });
"""
code = code.replace(block_1.strip(), new_block_1.strip())

# Fix 24h block in fetchNftMarketMovers
block_2 = """
        Object.entries(byName).forEach(([nftName, rows]) => {
          let closest = rows[0];
          let minDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTimeMs);
          for (const row of rows) {
            const diff = Math.abs(new Date(row.timestamp).getTime() - targetTimeMs);
            if (diff < minDiff) {
              minDiff = diff;
              closest = row;
            }
          }
          const closestAge = nowMs - new Date(closest.timestamp).getTime();
          if (closest && closest.floor_sfl > 0 && closestAge >= minAgeMs) {
            baselineMap[nftName] = Number(closest.floor_sfl);
            if (closestAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - closestAge;
          }
        });
"""
new_block_2 = """
        Object.entries(byName).forEach(([nftName, rows]) => {
          const futureRows = rows.filter(r => new Date(r.timestamp).getTime() >= targetTimeMs);
          if (futureRows.length > 0) {
            const closest = futureRows[0];
            const closestAge = nowMs - new Date(closest.timestamp).getTime();
            if (closest.floor_sfl > 0) {
              baselineMap[nftName] = Number(closest.floor_sfl);
              if (closestAge > (nowMs - oldestFoundMs)) oldestFoundMs = nowMs - closestAge;
            }
          }
        });
"""
code = code.replace(block_2.strip(), new_block_2.strip())

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("24h logic fixed!")
