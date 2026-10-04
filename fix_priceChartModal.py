import re

path = 'src/components/PriceChartModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Remove the fiat conversion block for resources
bad_block = r"""  let displayData = history;
  if \(!isToken && !isNftObj\) \{
    const usdRate = flowerPriceUsd \|\| 0\.05;
    displayData = displayData\.map\(\(d: ChartPoint\) => \{
      if \(!d\) return d;
      const originalPriceSfl = Number\(d\.price_sfl \?\? d\.avg_price_sfl \?\? 0\);
      let calculatedPrice = originalPriceSfl;
      if \(selectedCurrency !== 'usd' && d\.price_usd && usdRate > 0\) \{
         calculatedPrice = \(d\.price_usd / usdRate\);
      \}
      return \{ \.\.\.d, avg_price_sfl: calculatedPrice, price_sfl: calculatedPrice \};
    \}\);
  \}"""

code = re.sub(bad_block, "  const displayData = history;", code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Done PriceChartModal fix")
