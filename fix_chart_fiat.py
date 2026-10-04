import re

path = 'src/components/PriceChartModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add fiat multiplier
fiat_mult_code = """
  const fiatSymbol = symbolMap[selectedCurrency] || '$';
  const unitSymbol = isToken ? fiatSymbol : 'FLOWER';
  
  const fiatMultiplier = (isToken && flowerPrice && flowerPriceUsd) ? (flowerPrice / flowerPriceUsd) : 1;
"""
code = code.replace("  const fiatSymbol = symbolMap[selectedCurrency] || '$';\n  const unitSymbol = isToken ? fiatSymbol : 'FLOWER';", fiat_mult_code)

# 2. Multiply prices if isToken
map_code = """
  const prices = displayData
    .map((d) => {
      let p = Number(d?.price_sfl ?? d?.avg_price_sfl ?? d?.price_usd ?? d?.price ?? 0);
      if (isToken && (d?.price_usd !== undefined || d?.price !== undefined)) {
         p = p * fiatMultiplier;
      }
      return p;
    })
    .filter((p) => !isNaN(p) && isFinite(p) && p > 0);
"""
code = re.sub(r'  const prices = displayData[\s\S]*?\.filter\(\(p\) => !isNaN\(p\) && isFinite\(p\) && p > 0\);', map_code.strip(), code)

# We must also ensure displayData has the mutated values to send to PriceChartSVG
# Wait, PriceChartSVG renders `d.price_usd` or something?
# Let's check PriceChartSVG.
