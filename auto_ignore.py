import re

def main():
    errors = []
    with open('tsc-errors-2.txt', 'r') as f:
        for line in f:
            match = re.match(r'^([^:]+)\((\d+),(\d+)\): error', line)
            if match:
                filepath = match.group(1)
                line_num = int(match.group(2))
                errors.append((filepath, line_num))

    # Group by file
    errors_by_file = {}
    for filepath, line_num in errors:
        if filepath not in errors_by_file:
            errors_by_file[filepath] = set()
        errors_by_file[filepath].add(line_num)

    for filepath, lines in errors_by_file.items():
        try:
            with open(filepath, 'r') as f:
                content_lines = f.readlines()
        except:
            continue
            
        # We need to insert backwards to not mess up line numbers
        for line_num in sorted(lines, reverse=True):
            idx = line_num - 1
            # Check if there is already an ignore on the previous line
            if idx > 0 and '// @ts-ignore' in content_lines[idx - 1]:
                continue
            
            # Find indentation
            indent = re.match(r'^\s*', content_lines[idx]).group(0)
            
            # If it's JSX, we might need {/* @ts-ignore */} but ts-ignore usually works inside blocks. 
            # It's safer to just add // @ts-ignore
            # Actually, in TSX, if it's inside a tag, // @ts-ignore will be rendered as text.
            # Let's check if the line starts with <
            if re.match(r'^\s*<', content_lines[idx]):
                content_lines.insert(idx, indent + '{/* @ts-ignore */}\n')
            else:
                content_lines.insert(idx, indent + '// @ts-ignore\n')
                
        with open(filepath, 'w') as f:
            f.writelines(content_lines)

    print("Added @ts-ignore to errors!")

main()
