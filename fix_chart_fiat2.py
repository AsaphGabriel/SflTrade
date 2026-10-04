import re

path = 'src/components/PriceChartModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Emojis in PriceChartModal
code = code.replace('<span>📊</span>', '<span>[Chart]</span>')
code = code.replace('<span className="text-xl">📊</span>', '<span className="text-xl">📊</span>') # wait, let's just use ASCII / SVG
code = code.replace('📊', '')
code = code.replace('ℹ️', '(i)')
code = code.replace('⚡', '...')

# Fiat Multiplier inside loadData
multiplier_logic = """
        if (isMounted) {
          const fiatMultiplier = (isToken && flowerPrice && flowerPriceUsd) ? (flowerPrice / flowerPriceUsd) : 1;
          const mappedData = data.map(d => {
            if (isToken) {
              return {
                 ...d,
                 price_usd: d.price_usd ? d.price_usd * fiatMultiplier : d.price_usd,
                 price: d.price ? d.price * fiatMultiplier : d.price,
                 avg_price_sfl: d.avg_price_sfl ? d.avg_price_sfl * fiatMultiplier : d.avg_price_sfl,
                 price_sfl: d.price_sfl ? d.price_sfl * fiatMultiplier : d.price_sfl
              };
            }
            return d;
          });
          setHistory(mappedData);
          setLoading(false);
        }
"""
code = re.sub(r'        if \(isMounted\) \{\s*setHistory\(data\);\s*setLoading\(false\);\s*\}', multiplier_logic.strip(), code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("PriceChartModal updated")
