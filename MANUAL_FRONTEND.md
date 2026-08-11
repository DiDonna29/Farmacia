# Manual Técnico del Frontend: Arquitectura y Lógica de Negocio (MANUAL_FRONTEND.md)

Este documento detalla exhaustivamente la estructura, flujo de control, lógica de negocio y optimizaciones aplicadas en la interfaz de usuario del **Sistema de Inventario de Farmacia (SIFARMA - DEM)**.

---

## 1. Stack Tecnológico y Arquitectura del Cliente

El frontend está construido como una Single Page Application (SPA) moderna:
*   **Framework Principal**: Angular 21.
*   **Estructura de Componentes**: Standalone Components (sin módulos `@NgModule` intermedios), lo que optimiza el tamaño del bundle final y simplifica las importaciones directas.
*   **Manejo del Estado y Reactividad**: RxJS (uso intensivo de `BehaviorSubject`, `Observable`, operadores de filtrado y tuberías como `pipe()`).
*   **Diseño Visual (Aesthetics)**: Maquetado premium adaptado sobre el tema Phoenix, combinando hojas de estilos personalizadas (`app.css`), soporte nativo de modo oscuro/claro mediante `localStorage['phoenixTheme']`, sombras sutiles, degradados y loaders animados.
*   **Alertas y Confirmaciones**: SweetAlert2, encapsulado en un servicio común (`SwalService`) para alertas contextuales de éxito, error, loaders predictivos y cuadros de confirmación.

---

## 2. Flujo y Lógica Detallada por Módulo

### 2.1 Módulo de Autenticación (`features/auth/`)
*   **Control de Credenciales (Cédula)**: Limitado estrictamente a 8 dígitos numéricos mediante la directiva `appSoloNumeros` e inputs controlados para prevenir inyecciones de caracteres inválidos.
*   **Mecanismo de "Recordar Usuario"**:
    *   La casilla de verificación se inicializa siempre desactivada (`remember = false`) por razones de seguridad institucional.
    *   Si se marca e inicia sesión con éxito, guarda la cédula en el almacenamiento local y activa la API nativa del navegador `navigator.credentials.store()` para facilitar el reingreso.
    *   Si el usuario desmarca la casilla, se elimina la traza de `localStorage` y se vacía programáticamente el valor del campo `password` en el DOM en el momento exacto del submit. Esto previene que Google Chrome o Microsoft Edge muestren el diálogo flotante nativo que solicita recordar claves públicas.
*   **Recuperación de Contraseña**: Incorpora validación de la cédula del usuario en conjunto con un código OTP enviado al correo asociado antes de permitir el establecimiento de la nueva contraseña.

### 2.2 Dashboard (`features/dashboard/`)
*   **Indicadores Clave**: Consume el endpoint de estadísticas consolidado.
*   **Semaforización**:
    *   `🟢 ÓPTIMO`: Lote con vida útil mayor a 4 meses.
    *   `🟡 PRÓXIMO A VENCER`: Lote con vencimiento menor a 4 meses. Su color se forzó globalmente a amarillo de advertencia (`#ffc107` con fondo translúcido y borde sutil) para unificar la semaforización FEFO.
    *   `🔴 VENCIDO`: Lote caducado. Bloqueado automáticamente.
    *   `⚪ AGOTADO`: Existencia en 0.
*   **Graficación**: Integración de gráficos interactivos (Chart.js) que desglosan el porcentaje y estado del inventario activo.

### 2.3 Inventario y Semáforo (`features/inventario/`)
*   **Visualización**: Presenta una tabla con esqueletos de carga animados (Skeleton Loaders) que replican la disposición final del inventario para reducir la latitud visual percibida por el usuario.
*   **Ordenamiento**: Opciones dinámicas en cabecera para ordenar por orden alfabético, fecha de vencimiento (FEFO) o volumen de stock disponible.
*   **Acciones**:
    *   **Egreso Manual (Mermas)**: Permite a farmacéuticos y personal de proveeduría dar de baja cantidades de un lote por avería, derrame o caducidad. Abre un modal de ingreso que requiere justificación textual y valida que no se egrese más de la existencia actual del lote.
    *   **Edición**: Habilitada para modificar ubicación física, estanterías, y costos de los lotes activos.

### 2.4 Carga Masiva (`features/dotacion/`)
*   **Validación del Lado del Cliente**:
    *   Permite cargar planillas Excel (`.xlsx`) y procesarlas en dos fases (Previsualización -> Confirmación).
    *   Al recibir la respuesta de validación del backend, formatea los errores utilizando la propiedad CSS `white-space: pre-line` para pintar en múltiples líneas las viñetas explicativas y las variantes de catálogo sugeridas en caso de que existan discrepancias de nombre, presentación o principios activos.
*   ** loaders asíncronos**: Desactiva el overlay del loading spinner del SweetAlert de forma limpia antes de renderizar los modales en pantalla para evitar el bloqueo del cursor.

### 2.5 Despacho de Medicamentos (`features/despacho/`)
*   **Buscador en Cascada**:
    *   El usuario ingresa la cédula del beneficiario. El sistema ejecuta una llamada al proxy que interroga los WebServices centralizados.
    *   Si la cédula pertenece a un titular activo, recupera sus datos y carga un selector con todas sus **Cargas Familiares** registradas legalmente.
    *   Si pertenece a un beneficiario directo (carga familiar), selecciona al beneficiario y asocia automáticamente los datos del titular responsable.
*   **Lógica FEFO**:
    *   El catálogo disponible de medicamentos se obtiene a través del buscador general. Este catálogo tiene removido el límite técnico del backend de 20 registros, permitiendo cargar todos los lotes activos del almacén.
    *   El frontend los pagine localmente en grupos de 5 items y los ordena priorizando la fecha de caducidad más cercana para incentivar la salida oportuna del stock.
    *   **Inmutabilidad**: Al presionar procesar, el frontend congela y envía en el payload la Cédula y Nombre Completo del Titular junto con la Cédula y Nombre Completo del Beneficiario, garantizando que el acta PDF posterior permanezca inmune a alteraciones futuras de la nómina de RRHH.

### 2.6 Solicitudes y Requisiciones (`features/proveeduria/solicitudes/`)
*   **Restricciones de Rol en Origen y Destino**:
    *   Solo los Administradores y Directores Médicos tienen habilitados los selectores de dependencias para transferir material entre almacenes. Para el resto del personal, los dropdowns se autocompletan y deshabilitan (`[disabled]="true"`) de acuerdo con su rol (ej: Proveeduría se fija a `PROVEEDURIA` y Farmacia a `FARMACIA`).
    *   Se restringe por validación de formulario que el origen y destino nunca sean el mismo departamento.
*   **Vaciado Preventivo de Buffer (Seguridad de Esquemas)**:
    *   Para evitar el cruce de datos o el envío de lotes inválidos, cualquier cambio en los selectores de Origen o Destino gatilla de forma inmediata el vaciado automático de la lista temporal de insumos a solicitar, alertando al usuario mediante SweetAlert.
*   **Buscador Inteligente**:
    *   Admite búsquedas cruzadas y múltiples términos independientes (ej. "gasas esteriles caja").
*   **Procesamiento y Visualización**:
    *   **Acciones Centradas**: La columna de acciones en la tabla general de solicitudes se encuentra centrada estructuralmente para mejorar la simetría visual.
    *   **Motivo de Rechazo**: En caso de solicitudes en estado `RECHAZADA`, el modal de visualización ("VER") extrae las observaciones del backend y renderiza un recuadro destacado informando de manera explícita el porqué fue rechazada la orden.

### 2.7 Historial de Despachos (`features/historial/`)
*   **Filtros Inteligentes**:
    *   Por defecto inicializa con un rango de búsqueda del día anterior (ayer) a la fecha de hoy.
    *   **Bypass de Rango por Cédula o Folio**: Si se digita un valor de cédula o número de folio del acta, el componente reescribe automáticamente los inputs `desde` y `hasta` fijando la consulta en el rango de **un año atrás hasta hoy** (`[hoy - 365 días, hoy]`), lo que ahorra clics al farmacéutico al rastrear un acta antigua sin recordar su fecha.
    *   **Botón Limpiar**: Se le incorporó el icono de brochita `<span class="fas fa-brush me-1"></span>` y la palabra "Limpiar" y reestablece los filtros al rango estándar (ayer a hoy).

---

## 3. Lógica Angular Crítica: Ciclo de Renderizado Asíncrono

### 3.1 Cierre Síncrono de Modales y SweetAlert
En componentes con interacción dinámica (ej: Carga Masiva, Verificar Duplicados, Procesamiento de Solicitudes), Angular procesa peticiones HTTP asíncronas. Si se utiliza un loader de SweetAlert2 (`Swal.fire({didOpen: ...})`), este abre un overlay en el DOM con mayor index que los modales tradicionales de Bootstrap.
*   **Regla de Oro**: Siempre se debe llamar explícitamente a `this.swal.close()` o `Swal.close()` **antes** de habilitar los booleanos de modales en Angular (`showModal = true`), previniendo que la UI quede congelada o el fondo negro del modal de Bootstrap impida la interacción.

### 3.2 Detección de Cambios (`ChangeDetectorRef`)
Angular evalúa la detección de cambios mediante zonas. Al actualizar variables en los callbacks de peticiones asíncronas (`subscribe`), a veces se experimentan retrasos en el renderizado del DOM (por ejemplo, el modal se pinta en blanco hasta que el usuario hace clic en la pantalla).
*   **Solución**: Se inyecta `ChangeDetectorRef` y se llama síncronamente a `this.cdr.detectChanges()` inmediatamente después de modificar variables estructurales (`grupos`, `isLoading`, `showModalLupa`, etc.) en los flujos asíncronos. Esto fuerza al motor de renderizado a redibujar instantáneamente las vistas.

---

## 4. Gestión de Entornos Dinámicos (.env a environment.ts)

Para cumplir con las directrices de seguridad (no exponer credenciales ni IPs en el código fuente de Git) y mantener un flujo ágil, el frontend implementa una arquitectura de **Único Archivo de Entorno Autogenerado**:

### 4.1 Archivo Único de Entorno
Solo se utiliza el archivo `src/environments/environment.ts` para las importaciones del código. Los archivos redundantes de producción (como `environment.prod.ts`) fueron eliminados de la arquitectura.

### 4.2 Script Generador `set-env.js`
Durante la ejecución de tareas en el ciclo de vida del proyecto (hooks de npm), se invoca el script `frontend/scripts/set-env.js`. Este script:
1. Lee las variables del archivo `.env` del frontend:
   * `API_URL_DEV`: Dirección base del backend local/pruebas.
   * `API_URL_PROD`: Dirección base del backend de producción formal.
2. Identifica el modo de compilación según la bandera `--mode` (`production` o `development`).
3. Sobrescribe el contenido de `environment.ts` inyectando dinámicamente el valor correspondiente de la URL de la API y la bandera de producción:
   ```typescript
   export const environment = {
     production: true, // o false según corresponda
     apiUrl: 'URL_CORRECTA_DEL_ENV',
     useMock: false,
   };
   ```

### 4.3 Hooks de Automatización (`package.json`)
El script se ejecuta de manera transparente al inicio de cada proceso mediante los disparadores de npm:
*   `prestart`: Ejecuta `node scripts/set-env.js --mode development` antes de iniciar `ng serve`.
*   `prebuild`: Ejecuta `node scripts/set-env.js --mode production` antes de compilar con `ng build`.
*   El script `start_app.ps1` de PowerShell a nivel raíz también invoca esta rutina con la IP dinámica provista por argumentos de consola.


