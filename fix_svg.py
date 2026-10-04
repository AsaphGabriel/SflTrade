import re

path = 'src/components/charts/PriceChartSVG.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

old_circle = """<circle
              key={i}
              cx={cx}
              cy={cy}
              r="4.5"
              className="fill-emerald-400 hover:r-6.5 hover:fill-amber-400 transition-all cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}
            />"""

new_circle = """<g key={i}
              onMouseEnter={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={() => setHoveredPoint({ ...d, x: cx, y: cy, val })}>
              <circle cx={cx} cy={cy} r="16" className="fill-transparent stroke-transparent cursor-pointer" />
              <circle cx={cx} cy={cy} r={hoveredPoint?.x === cx ? "6.5" : "4.5"} className={hoveredPoint?.x === cx ? "fill-amber-400" : "fill-emerald-400"} />
            </g>"""

if old_circle in code:
    code = code.replace(old_circle, new_circle)
else:
    print("WARNING: Could not find exact old_circle text")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("SVG fixed!")
