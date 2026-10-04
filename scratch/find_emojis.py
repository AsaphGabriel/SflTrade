import os
import emoji

def find_emojis(folder):
    for root, dirs, files in os.walk(folder):
        for file in files:
            if not file.endswith(('.tsx', '.ts', '.jsx', '.js', '.css', '.html')):
                continue
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                emojis_found = [c for c in content if c in emoji.EMOJI_DATA]
                if emojis_found:
                    print(f"{path}: {''.join(set(emojis_found))}")

find_emojis('src')
