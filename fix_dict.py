import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find cases of const something = {}; or let something = {};
    # and replace with Record<string, any> if not already typed
    content = re.sub(r'(let|const)\s+([a-zA-Z0-9_]+)\s*=\s*\{\};', r'\1 \2: Record<string, any> = {};', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx'):
            process_file(os.path.join(root, f))
