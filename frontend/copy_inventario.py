import sys

src_path = r"c:\Users\Usuario\Desktop\Developments\Farmacia-DEM\frontend\src\app\features\inventario\inventario.component.ts"
dst_path = r"c:\Users\Usuario\Desktop\Developments\Farmacia-DEM\frontend\src\app\features\proveeduria\inventario\inventario.component.ts"

with open(src_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace selector
content = content.replace("selector: 'app-inventario',", "selector: 'app-proveeduria-inventario',")

# Replace title
content = content.replace("<h2 class=\"mb-2 text-1100\">Inventario Completo</h2>", "<h2 class=\"mb-2 text-1100\">Inventario General de Proveeduría</h2>")
content = content.replace("<h5 class=\"text-700 fw-semi-bold\">Gestión de existencias y control de vencimientos</h5>", "<h5 class=\"text-700 fw-semi-bold\">Gestión centralizada de suministros institucionales</h5>")

# Replace roles in esOperativo
content = content.replace("this.authSvc.hasRole('ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO')", "this.authSvc.hasRole('ADMINISTRADOR', 'PROVEEDURIA')")

# Add schema: 'proveeduria' to getInventario
content = content.replace("ordering: this.ordering", "ordering: this.ordering,\n      schema: 'proveeduria'")

with open(dst_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Copia completada con modificaciones.")
