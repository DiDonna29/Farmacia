import re

with open('src/app/features/dotacion/dotacion.component.ts', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'confirmarCargaMasiva\(\): void \{.*?\n  \}\n\}', content, re.DOTALL)
if match:
    correct_content = content[:match.end()] + '\n'
    with open('src/app/features/dotacion/dotacion.component.ts', 'w', encoding='utf-8') as f:
        f.write(correct_content)
    print("Fixed file.")
else:
    print("Match not found.")
