# ⚙️ Guía de Desarrollo: Backend (Django 5.0)

Este documento proporciona una descripción técnica detallada del backend del **Sistema de Inventario de Salud y Abastecimiento al Personal (SISAP)**.

---

## 🛠️ Stack Tecnológico
*   **Framework**: Django 5.0.4
*   **API Engine**: Django Rest Framework (DRF)
*   **Base de Datos**: PostgreSQL 14+ (organizado en esquemas institucionales)
*   **Seguridad**: JWT (SimpleJWT) y Control de Acceso Basado en Roles (RBAC)
*   **Reportes**: ReportLab (Generación de PDF) y OpenPyXL (Gestión de planillas Excel)

---

## 📂 Directorio del Backend y Aplicaciones Django
*   `inventario_farmacia/`: Configuración del proyecto (`settings.py`, `urls.py`, `asgi.py`, `wsgi.py`).
*   `api/`: Controlador central de peticiones del frontend y mocks. Contiene además los archivos JSON de mock en `api/mocks/` para simular la base de datos de Bienestar Social localmente.
*   `apiserializers/`: Serializadores de modelos para validación de entrada/salida de datos de las APIs.
*   `apiviews/`: Vistas de API basadas en clases (CBV) para modularidad de endpoints.
*   `utilidades/`: Contiene scripts auxiliares, como la generación dinámica del manual de usuario en PDF (`generate_manual.py`).

---

## 🗄️ Arquitectura de Base de Datos y Esquemas en PostgreSQL
La base de datos utiliza una segmentación por esquemas lógicos para aislar responsabilidades de acuerdo con la estructura del organismo:

1.  **Esquema `farmacia`**: Contiene la tabla de inventarios, insumos y el control directo de vencimiento de lotes del dispensario central.
2.  **Esquema `proveeduria`**: Contiene las tablas `lotes`, `solicitudes` y `solicitudes_detalle` de compras y reabastecimientos a granel.
3.  **Esquema `servicio_medico`**: Administra los datos internos de pacientes, dependencias e históricos de atenciones.
4.  **Esquema `public`**: Mantiene las tablas de autenticación por defecto de Django, la tabla de roles (`roles`), logs de auditoría general (`auditoria_logs`) y logs del servidor de desarrollo.

### Vistas Estratégicas
El backend delega consultas analíticas pesadas a vistas integradas en PostgreSQL:
*   `farmacia.vista_semaforo_inventario`: Calcula el estado lógico (VIGENTE, PRÓXIMO A VENCER o VENCIDO) basado en las fechas actuales.
*   `proveeduria.vista_inventario`: Consolida stock e información cruzada de lotes de proveduría.

---

## 🚀 Inicialización Unificada en Producción
Para desplegar la aplicación en un entorno limpio desde cero, existe el script maestro unificado:

```bash
python setup_production.py
```

### Funciones que realiza este script:
1.  **Esquematización**: Crea los esquemas lógicos (`farmacia`, `proveeduria`, `servicio_medico`) si no existen.
2.  **Tablas y Secuencias**: Inicializa y migra las tablas de base a sus esquemas respectivos y corrige los punteros de secuencias de IDs (`fix_sequences.py`) para evitar colisiones en llaves primarias.
3.  **Inyección de Roles**: Carga los 8 roles necesarios del sistema y su permisología predeterminada.
4.  **Cuentas Maestras**: Crea los usuarios críticos iniciales:
    *   **Administrador**: CI `12345678` (Clave: `admin12345678`)
    *   **Director del Servicio Médico**: CI `9876543` (Clave: `director123`)
    *   **Auditor del Sistema**: CI `96325874` (Clave: `auditor123`)

---

## 🔌 Conexión e Integración de WebServices
El sistema requiere consultar la información de empleados y sus cargas familiares registrada en la base de datos de **Bienestar Social**. Esta integración está parametrizada en el archivo `.env`:

*   **Entorno de Producción**:
    `BIENESTAR_ACTUAL_URL`: Dirección HTTP del servidor del Servicio Médico (ej: `http://172.26.98.98:9001/api/buscar-empleado/`).
*   **Entorno de Desarrollo (Simulado)**:
    `BIENESTAR_MOCK_PATH`: Ruta local del archivo mock (`api/mocks/bienestar_mock.json`). Si la conexión HTTP falla o no está configurada, el backend recurre de manera transparente a este archivo JSON para permitir el desarrollo offline.
