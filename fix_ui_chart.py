import re

path = 'src/components/PriceChartModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the buttons layout
# <div className="flex bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
code = code.replace(
    '<div className="flex bg-slate-800 p-1 rounded-xl w-full sm:w-auto">',
    '<div className="grid grid-cols-4 bg-slate-800 p-1 rounded-xl w-full gap-1">'
)
# Update buttons to take full width
code = code.replace(
    'className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
    'className={`w-full px-2 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

path_svg = 'src/components/charts/PriceChartSVG.tsx'
with open(path_svg, 'r', encoding='utf-8') as f:
    svg_code = f.read()

# Increase height
svg_code = svg_code.replace(
    'className="w-full h-52 overflow-visible"',
    'className="w-full h-64 overflow-visible"'
)

# Replace circle mapping
# Old: <circle key={i} cx={x} cy={y} r="4.5" className="fill-green-500 ...
# We want to wrap it in a <g> with a transparent larger circle for touch
circle_regex = r'<circle\s+key=\{i\}\s+cx=\{x\}\s+cy=\{y\}\s+r="4\.5"\s+className="([^"]+)"[^>]*/>'
def replace_circle(match):
    cls = match.group(1)
    return f"""<g key={{i}} onMouseEnter={{() => setHoveredIndex(i)}} onMouseLeave={{() => setHoveredIndex(null)}} onTouchStart={{() => setHoveredIndex(i)}}>
            <circle cx={{x}} cy={{y}} r="16" className="fill-transparent stroke-transparent cursor-pointer" />
            <circle cx={{x}} cy={{y}} r={{hoveredIndex === i ? "6" : "4"}} className="{cls} pointer-events-none transition-all duration-200" />
          </g>"""

svg_code = re.sub(circle_regex, replace_circle, svg_code)

# Remove the old onMouseEnter/onMouseLeave from the original circle if it had them, but we used regex
# Let's ensure we didn't duplicate it.

with open(path_svg, 'w', encoding='utf-8') as f:
    f.write(svg_code)

print("UI fixed!")
