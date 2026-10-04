import re

path = 'src/components/FarmDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Specifically replace the visual emojis with nothing or a safe ASCII.
# Some might have space after them, so let's strip those too if it makes sense.
replacements = {
    '⌛': '', '☁': '[Cloud]', '⚖': '', '⚙': '[Config]', '⚠': '(!)', '⚡': '', '⛏': '', '✅': '[OK]',
    '✨': '', '⭐': '*', '️': '', '🌐': '[Global]', '🌱': '', '🌾': '', '🎉': '', '🏝': '', '🏷': '',
    '🏺': '', '🐔': '', '👑': '', '👥': '', '💎': '', '💖': '', '💰': '', '💾': '[Save]', '📦': '',
    '🔄': '[Sync]', '🔐': '', '🔑': '[Auth]', '🛡': '', '🧑': '', '🪙': '', '☁️': '[Cloud]'
}

for emoji, replacement in replacements.items():
    code = code.replace(emoji + ' ', replacement + (' ' if replacement else ''))
    code = code.replace(emoji, replacement)

# Clean up double spaces or brackets next to each other
code = code.replace('[Cloud] [Cloud]', '[Cloud]')
code = code.replace('  ', ' ')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Emojis stripped from FarmDashboard.tsx")
