import os

root_dir = r"c:\Users\Usuario\Desktop\Developments\Farmacia-DEM\frontend\src\app"
term = "sigefirrhh"

print(f"Searching frontend files for '{term}':")
found = False
for dirpath, _, filenames in os.walk(root_dir):
    for f in filenames:
        if f.endswith(('.ts', '.html', '.css')):
            path = os.path.join(dirpath, f)
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    if term in content or term.upper() in content:
                        print(f"Found in {os.path.relpath(path, root_dir)}")
                        found = True
            except Exception as e:
                pass
if not found:
    print("No references found in frontend.")
