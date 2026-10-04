import os
import emoji

def strip_emojis(text):
    return emoji.replace_emoji(text, replace='')

files_to_clean = [
    'src/App.tsx',
    'src/i18n.ts',
    'src/components/Header.tsx',
    'src/components/MarketMoversCards.tsx',
    'src/components/PortfolioTable.tsx',
    'src/components/AuthModal.tsx',
    'src/components/PositionDetailsModal.tsx'
]

for file_path in files_to_clean:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = strip_emojis(content)
        # also clean double spaces that might be left
        new_content = new_content.replace('  ', ' ')
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Cleaned {file_path}")
