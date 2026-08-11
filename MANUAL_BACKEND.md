# Manual Técnico del Backend: Arquitectura, Modelos y Lógica (MANUAL_BACKEND.md)

Este documento describe con detalle la arquitectura del servidor, el diseño de base de datos multiesquema, los algoritmos de negocio y las integraciones de la API del **Sistema de Inventario de Farmacia (SIFARMA - DEM)**.

---

## 1. Arquitectura de Desarrollo y Directorios

El backend está desarrollado sobre **Django 5.0.4** y estructurado de la siguiente forma:
*   **`inventario_farmacia/`**: Directorio de configuración global. Contiene el archivo `settings.py` (ajustes de base de datos, CORS, JWT y seguridad) y `urls.py` (ruteo principal de la aplicación).
*   **`api/`**: Aplicación Django central que unifica la capa de negocio.
    *   `api/views/`: Controladores de API basados en clases (CBV) divididos por módulos (`auth_views.py`, `despacho_views.py`, `dotacion_views.py`, etc.).
    *   `api/serializers/`: Serializadores de DRF que validan y transforman los payloads de entrada y respuestas de salida.
    *   `api/utils/`: Funciones utilitarias (generación de PDFs, ingesta de WebServices y auditoría).
    *   `api/mocks/`: Archivos JSON de supervivencia local para pruebas offline y fallbacks.
*   **`scripts/`**: Scripts administrativos y de inicialización del sistema.

---

## 2. Base de Datos y Segmentación de Esquemas (PostgreSQL)

Para garantizar el cumplimiento de las normativas de auditoría y evitar la mezcla física de materiales farmacéuticos y de oficina, el sistema implementa una **segmentación por esquemas** dentro de una única base de datos PostgreSQL:

1.  **Esquema `public`**: Alberga las tablas por defecto del motor de Django (sesiones, migraciones, llaves de JWT blacklist) y las tablas transversales de seguridad:
    *   `api_userprofile`: Extensión de la tabla de usuarios con campos de cédula y rol.
    *   `roles`: Tabla paramétrica que almacena los niveles de acceso.
    *   `auditoria_logs`: Registro de bitácora transaccional para auditorías.
2.  **Esquema `farmacia`**: Controla el inventario del dispensario de medicamentos.
    *   `medicamentos_base`: Catálogo maestro de medicamentos.
    *   `lotes`: Lotes de medicamentos con fechas de vencimiento y existencias.
    *   `despachos_actas`: Historial congelado de actas entregadas a beneficiarios.
3.  **Esquema `proveeduria`**: Controla el inventario general y de insumos médico-quirúrgicos.
    *   `lotes`: Lotes de insumos generales.
    *   `solicitudes` y `solicitudes_detalle`: Órdenes y requisiciones de almacén.
4.  **Esquema `servicio_medico`**: Registra datos auxiliares y configuraciones clínicas.

### 2.1 El Motor de Semáforo: Vistas SQL
Para optimizar las consultas analíticas del inventario, la lógica del semáforo de vencimiento está programada directamente en base de datos mediante la vista `farmacia.vista_semaforo_inventario`:
*   **Óptimo**: `fecha_vencimiento > CURRENT_DATE + INTERVAL '4 months'`
*   **Próximo a Vencer**: `fecha_vencimiento <= CURRENT_DATE + INTERVAL '4 months' AND fecha_vencimiento >= CURRENT_DATE`
*   **Vencido**: `fecha_vencimiento < CURRENT_DATE`
*   **Agotado**: `cantidad_actual = 0`

---

## 3. Algoritmos y Reglas Críticas de Negocio

### 3.1 Criterio de Salida FEFO (First Expired, First Out)
En el endpoint de búsqueda para despachos (`BuscarMedicamentoDespachoView`), el sistema ejecuta una consulta sobre `vista_semaforo_inventario` aplicando filtros estrictos:
1.  **Fecha Vigente**: Excluye lotes vencidos (`fecha_vencimiento >= CURRENT_DATE`).
2.  **Existencia Positiva**: Excluye lotes vacíos (`cantidad_actual > 0`).
3.  **Orden Cronológico**: Aplica `ORDER BY fecha_vencimiento ASC` para asegurar que el farmacéutico siempre despache primero el lote con caducidad más cercana.

### 3.2 Inmutabilidad e Integridad de Despacho
Para evitar que una modificación posterior en la nómina de RRHH o una caída de los servicios de Bienestar Social corrompa los comprobantes de entrega:
*   La tabla `despachos_actas` almacena físicamente `cedula_titular` y `nombre_titular`.
*   El backend guarda los datos capturados del beneficiario y titular de forma redundante y "congelada" en el registro del acta.

### 3.3 Integración de WebService con Triple Fallback
La consulta de empleados en `BienestarBeneficiarioView` ejecuta un flujo tolerante a fallos:
1.  **Nivel 1 (WebService Viejo)**: Lanza una petición `GET` HTTP al servidor heredado.
2.  **Nivel 2 (WebService Nuevo)**: Lanza una petición `POST` HTTP enviando la cédula en formato JSON.
3.  **Nivel 3 (Mock Local)**: Si ambos fallan o no hay conexión de red, recupera los datos del archivo local `api/mocks/bienestar_mock.json` de forma transparente.
*   **Normalización**: Si los campos de dependencia o cargo del servidor externo vienen vacíos, inyecta por defecto `"BIENESTAR SOCIAL"` y `"FUNCIONARIO"` para evitar errores de tipo nulo en el renderizado de PDFs.

### 3.4 Importación Masiva y Validación por Expresiones Regulares
El endpoint `CargarLoteMasivoView` realiza el parsing de archivos Excel y CSV aplicando lógica rigurosa:
*   **Parseo de Componentes**: Utiliza expresiones regulares (`re.match`) para separar cadenas (ej. `"PARACETAMOL 500 MG"`) en sus tres variables fundamentales: Principio Activo (`"PARACETAMOL"`), Concentración (`500`) y Unidad (`"MG"`).
*   **Validación de Catálogo**: Compara el medicamento, la presentación y los componentes parsed contra la base de datos de medicamentos base. Si no coinciden al 100%, rechaza la carga completa y devuelve un listado estructurado de variantes similares sugeridas en esa celda para corregir errores ortográficos.

### 3.5 Restricciones de Cuentas (RBAC a nivel de Base de Datos)
El modelo de usuarios y roles valida dos reglas incondicionales en `usuarios_views.py`:
1.  **Administrador Único**: La base de datos solo permite un registro activo con el rol `ADMINISTRADOR`.
2.  **Director Activo Único**: Se pueden tener múltiples registros con el rol `DIRECTOR_SERVICIO_MEDICO`, pero solo uno de ellos puede estar activo (`is_active = True`) al mismo tiempo. Al intentar activar a un segundo director, el sistema devuelve un código `400 Bad Request` indicando la colisión.

### 3.6 Requisiciones Cruzadas y Flujo para Entidades Externas
La aprobación de órdenes gestiona el stock de forma inteligente en `ProcesarSolicitudView`:
*   **Entre Almacenes Internos (Farmacia <-> Proveeduría)**: Descuenta stock de los lotes del origen y crea un lote homólogo en el inventario del destino bajo la misma fecha y número de lote (transferencia lógica).
*   **Hacia Dependencias Externas (ej. TEPUY)**: Si el departamento destino no gestiona inventarios internos en la plataforma (no contiene en su nombre `"FARM"` o `"PROV"`), realiza una **salida directa**. Descuenta las cantidades del almacén de origen y registra el egreso directamente, evitando la creación virtual de stock fantasma.
*   **Motivo de Rechazo**: En caso de rechazo, el texto del motivo se concatena al final del campo de observaciones de la solicitud con el prefijo `[RECHAZO]:` para permitir su lectura histórica.

---

## 4. Generación de Actas en PDF (ReportLab)

La clase `GenerarComprobantePDFView` y `SolicitudPDFView` construyen documentos formales utilizando ReportLab:
*   **Estructura Dinámica**: Utiliza un flujo de elementos (Story) que adapta el tamaño del PDF dependiendo de la cantidad de ítems.
*   **Plantilla de Firmas**: Inyecta bloques simétricos en el pie de página para la firma y sello del farmacéutico despachador y el beneficiario/receptor.
*   **Preservación de Saltos**: Mantiene los saltos de línea de las observaciones en el reporte utilizando estilos del módulo `Paragraph` y reemplazos controlados de saltos de carro.

---

## 5. Scripts de Inicialización y Mantenimiento

*   **`setup_production.py`**:
    *   Crea la base de datos y esquemas lógicos.
    *   Inyecta los roles del sistema (`ADMINISTRADOR`, `FARMACEUTICO`, etc.).
    *   Genera las cuentas administrativas por defecto y reinicia las secuencias de IDs para prevenir colisiones en llaves primarias.
*   **`scripts/run_migrations.py`**:
    *   Ejecuta `makemigrations` y `migrate`.
    *   Inyecta el código SQL puro para la creación/recreación de las vistas semáforo en los esquemas `farmacia` y `proveeduria`.

