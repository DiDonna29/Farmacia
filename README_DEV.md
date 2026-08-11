# Guía para Desarrolladores (README_DEV)

Este documento está destinado al equipo técnico encargado de mantener, desarrollar y desplegar nuevas características en el sistema SIFARMA-DEM.

## ⚙️ Requisitos Previos (Entorno Local)

Para correr la aplicación en entorno de desarrollo, asegúrate de contar con:

- **Python** 3.12 o superior (Backend).
- **Node.js** 20+ y NPM (Frontend).
- **Angular CLI** 21+.
- **PostgreSQL** 16+ instalado y corriendo.

## 🚀 Levantando el Entorno de Desarrollo

### 1. Base de Datos
1. Inicia sesión en PostgreSQL (pgAdmin o psql) y crea una base de datos vacía:
   ```sql
   CREATE DATABASE db_farmacia;
   ```
2. Asegúrate de tener las credenciales correctas en el archivo `.env` del backend (copia `.env.example` a `.env`).

### 2. Backend (Django)
1. Abre una terminal y dirígete a `/backend`.
2. Activa el entorno virtual:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
3. Instala las dependencias (si no lo has hecho):
   ```bash
   pip install -r requirements.txt
   ```
4. **Ejecuta el Script de Configuración Inicial**:
   La carpeta `backend/scripts/` contiene los scripts automatizados que crean las vistas SQL complejas y corren las migraciones:
   ```bash
   python scripts/run_migrations.py
   ```
5. **Genera los Usuarios de Prueba** (Opcional, para desarrollo):
   ```bash
   python scripts/init_demo_users.py
   ```
   Esto creará automáticamente a `admin`, `proveeduria`, `farmaceutico`, etc., con contraseñas seguras (`Admin123*`).
6. Inicia el servidor de desarrollo:
   ```bash
   python manage.py runserver
   ```
   *El backend estará disponible en `http://localhost:8000`.*

### 3. Frontend (Angular)
1. Abre una nueva terminal y dirígete a `/frontend`.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo de Angular:
   ```bash
   npm start
   ```
   *El frontend estará disponible en `http://localhost:4200`.*

### 4. Automatización con Scripts de Despliegue (NUEVO)
En lugar de abrir dos terminales manualmente y ejecutar los comandos de Django y Angular por separado, puedes utilizar el script de PowerShell integrado en la raíz del proyecto para automatizar todo el arranque:
```powershell
.\start_app.ps1
```
*Este script verifica automáticamente la existencia del `.venv` y de `node_modules`, instala las dependencias necesarias de `requirements.txt` y `package.json`, auto-configura el archivo `environment.ts` de Angular con las IPs correspondientes y lanza ambos servidores en ventanas separadas simultáneamente.*

Si necesitas especificar IPs para pruebas en red local, puedes hacerlo enviando parámetros:
```powershell
.\start_app.ps1 -BackendIP "172.26.98.30" -BackendPort "8005" -FrontendHost "0.0.0.0" -FrontendPort "80"
```
Para forzar una reinstalación profunda: `.\start_app.ps1 -ForceInstall`

---

## 🛠 Arquitectura Interna y Scripts

### Migraciones y Base de Datos
Debido a la complejidad del sistema (Schemas divididos entre `farmacia` y `proveeduria`, y vistas SQL de reportes de caducidad), las migraciones estándar de Django `makemigrations` no son suficientes para recrear toda la base de datos de 0.
Siempre que necesites reconstruir la base de datos o modificar la vista del semáforo, utiliza `python scripts/run_migrations.py`, el cual inyecta el SQL crudo de las vistas `vista_semaforo_inventario` en sus respectivos schemas de PostgreSQL de forma segura.

### Seguridad y RBAC
El sistema inyecta Guards en Angular (`HasRoleGuard`) que leen los roles del JWT decodificado (`localStorage`).
Si requieres crear una nueva ruta que solo un rol pueda ver, debes agregarlo en `app.routes.ts`:
```typescript
{
   path: 'papelera',
   component: PapeleraComponent,
   canActivate: [AuthGuard, HasRoleGuard],
   data: { roles: ['ADMINISTRADOR', 'PROVEEDURIA'] }
}
```

### Endpoints Cruzados (Cross-Schema)
Existen Views en Django (ej. `InventarioViewSet`) que leen el parámetro `?schema=farmacia` o `?schema=proveeduria` para decidir en qué tabla PostgreSQL consultar, lo que permite reutilizar el 90% del código del frontend al conectar componentes idénticos a bases de datos totalmente diferentes.

## 📝 Reglas para Subir Cambios a Producción (Build)

1. Antes de subir a producción, realiza un test corriendo:
   ```bash
   npm run build
   ```
2. Asegúrate de corregir cualquier Warning del *budget* (tamaño de bundle de Angular).
3. No envíes código de desarrollo (`console.log`, variables no usadas). El sistema está configurado en un entorno médico estricto.

