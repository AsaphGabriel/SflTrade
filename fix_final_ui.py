import re

path = 'src/components/PriceChartModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the wrapper
code = code.replace(
    '<div className="flex flex-col items-center gap-2">',
    '<div className="flex flex-col items-stretch w-full gap-2">'
)
# Update skeleton height
code = code.replace(
    'className="h-52 flex items-center justify-center',
    'className="h-72 flex items-center justify-center'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

path_svg = 'src/components/charts/PriceChartSVG.tsx'
with open(path_svg, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('h-64', 'h-80')
code = code.replace('strokeWidth="2.5"', 'strokeWidth="4"')
code = code.replace('strokeWidth="1.8"', 'strokeWidth="2.5"')

with open(path_svg, 'w', encoding='utf-8') as f:
    f.write(code)

print("UI sizes and grid updated!")
