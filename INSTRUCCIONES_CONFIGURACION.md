# Instrucciones de Configuración (Despliegue a Producción)

Este documento te guía paso a paso para desplegar el Sistema de Inventario de Farmacia y Proveeduría (SIFARMA - DEM) en un servidor local (Intranet) o en la Nube, garantizando alta disponibilidad y seguridad para un entorno hospitalario/institucional.

## Requisitos del Servidor (Hardware Mínimo)
- **CPU**: 4 Cores (recomendado).
- **RAM**: 8 GB.
- **Almacenamiento**: 50 GB SSD.
- **SO**: Windows Server 2019+ o Ubuntu Server 22.04 LTS.

---

## 1. Configuración de la Base de Datos (PostgreSQL)

1. Instala PostgreSQL 16 y asegúrate de configurar una contraseña segura para el usuario `postgres`.
2. Habilita las conexiones remotas modificando `pg_hba.conf` y `postgresql.conf` si el servidor de base de datos está separado del servidor web.
3. Crea la base de datos de producción:
   ```sql
   CREATE DATABASE db_farmacia;
   ```
4. **Respaldo Automático**: Configura una tarea programada (cron) o Windows Task Scheduler usando `pg_dump` para realizar backups diarios a las 3:00 AM.

---

## 2. Despliegue del Backend (Django)

1. Clona el repositorio y dirígete a `backend/`.
2. Crea el entorno virtual en producción y actívalo:
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Linux
   venv\Scripts\activate     # En Windows
   ```
3. Instala los requerimientos fijos:
   ```bash
   pip install -r requirements.txt
   ```
4. Configura el archivo `.env` en producción.
   Asegúrate de que `DEBUG=False` y configura tu base de datos y llaves JWT secretas.
   ```env
   DEBUG=False
   SECRET_KEY=TU_CLAVE_SUPER_SECRETA_LARGA
   DB_NAME=db_farmacia
   DB_USER=postgres
   DB_PASSWORD=tu_password
   DB_HOST=127.0.0.1
   DB_PORT=5432
   ```
5. Aplica migraciones y vistas cruzadas usando los nuevos scripts del sistema:
   ```bash
   python scripts/run_migrations.py
   ```
6. Inicializa usuarios predeterminados (Solo en el primer despliegue):
   ```bash
   python scripts/init_demo_users.py
   ```
   *Nota: Recuerda obligar a los administradores a cambiar sus claves de inmediato.*
7. **Servidor Web**: No utilices `runserver` en producción formal de alto tráfico.
   - En **Linux**, utiliza Gunicorn: `gunicorn core.wsgi:application --bind 0.0.0.0:8000`
   - En **Windows**, utiliza Waitress: `waitress-serve --port=8000 core.wsgi:application`

### 2.1 Despliegue Express en Windows (Alternativa Automatizada)
Para despliegues rápidos en Intranet o servidores locales con Windows Server, puedes utilizar el script de PowerShell integrado que automatiza la configuración completa, levanta ambos servidores y reescribe los IPs del frontend al vuelo:

```powershell
.\start_app.ps1 -BackendIP "172.26.98.30" -BackendPort "8005" -FrontendHost "172.26.98.30" -FrontendPort "1005" -ForceInstall
```
*Este comando se asegurará de reinstalar paquetes, preparar los entornos y levantar los procesos simultáneamente.*

---

## 3. Despliegue del Frontend (Angular)

1. Ve a la carpeta `frontend/` en el servidor.
2. Configura las URLs en el archivo [.env](file:///c:/Users/didonna/Desktop/proyectos_dem/Farmacia-DEM/frontend/.env). Asegúrate de que `API_URL_PROD` tenga la IP y puerto de producción correctos (ambas variables `API_URL_DEV` y `API_URL_PROD` pueden permanecer activas/descomentadas en el archivo):
   ```env
   API_URL_DEV=http://172.26.98.30:8005/api
   API_URL_PROD=https://172.26.97.190:9010/api
   ```
3. Ejecuta la instalación y compilación de producción optimizada:
   ```bash
   npm install
   npm run build
   ```
   *Nota: Al ejecutar `npm run build`, se activa el script `prebuild` (`set-env.js --mode production`) que inyecta automáticamente la URL de producción del `.env` en el archivo de configuración `src/environments/environment.ts` antes de la compilación.*
4. **Configuración de Nginx o Apache**:
   Debes servir la carpeta `dist/farmacia/browser` (para Angular 17+) y rutear todas las solicitudes a `index.html`.
   
   *Ejemplo de Bloque Nginx (`nginx.conf`)*:
   ```nginx
   server {
       listen 80;
       server_name intranet.dem.gov;

       root /var/www/SIFARMA/frontend/dist/farmacia;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://127.0.0.1:8005/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

---

## 4. Validaciones Finales

- Ingresa a la IP del servidor desde el navegador de un cliente de la red.
- Verifica que el login responda (probando la conexión cruzada Frontend -> API -> PostgreSQL).
- Navega al apartado de Proveeduría e intenta listar el inventario. Si el semáforo y las fechas cargan bien, la conexión y las Vistas SQL están completamente funcionales.
- Intenta generar un PDF de una dotación antigua; esto probará que ReportLab tiene acceso a la escritura de archivos temporales en el sistema.

---

## 📚 Documentación Técnica de Referencia
Para resolver dudas sobre la arquitectura interna o los endpoints durante el proceso de despliegue, consulta:
*   [Manual Técnico del Backend](MANUAL_BACKEND.md)
*   [Manual Técnico del Frontend](MANUAL_FRONTEND.md)
*   [Diccionario de APIs y Endpoints](DOCUMENTACION_APIS.md)

