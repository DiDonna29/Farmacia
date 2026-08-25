# Documentación de APIs y Endpoints (DOCUMENTACION_APIS.md)

Este documento detalla todos los endpoints expuestos por el Backend de **SIFARMA - DEM**, incluyendo su método HTTP, parámetros de entrada (Query Params / JSON Body), y su propósito de negocio.

---

## 1. Módulo de Autenticación (`/api/auth/`)

### 1.1 Iniciar Sesión (Login)
*   **Endpoint**: `POST /api/auth/login/`
*   **Permiso**: Público
*   **Payload**:
    ```json
    {
      "username": "12345678", // Cédula del usuario (máx. 8 dígitos)
      "password": "mi_password"
    }
    ```
*   **Respuesta**: Retorna los tokens JWT de acceso (`access`) y refresco (`refresh`), junto con el rol y datos básicos del usuario.

### 1.2 Cerrar Sesión (Logout)
*   **Endpoint**: `POST /api/auth/logout/`
*   **Permiso**: Autenticado
*   **Payload**:
    ```json
    {
      "refresh": "token_refresh_string"
    }
    ```
*   **Propósito**: Añade el token de refresco a la lista negra (blacklist) para inhabilitar la sesión.

### 1.3 Refrescar Token JWT
*   **Endpoint**: `POST /api/auth/refresh/`
*   **Permiso**: Público (con token válido)
*   **Payload**:
    ```json
    {
      "refresh": "token_refresh_string"
    }
    ```
*   **Respuesta**: Retorna un nuevo token de acceso `access`.

### 1.4 Obtener Perfil Activo
*   **Endpoint**: `GET /api/auth/me/`
*   **Permiso**: Autenticado
*   **Respuesta**: Datos del perfil del usuario logueado (Cédula, Nombre, Rol, Estado Activo, etc.).

### 1.5 Modificar Datos de Perfil
*   **Endpoint**: `PUT /api/auth/profile/`
*   **Permiso**: Autenticado
*   **Payload**: JSON con nombre, correo, teléfono a actualizar.

### 1.6 Cambiar Contraseña (Dentro de Sesión)
*   **Endpoint**: `POST /api/auth/change-password/`
*   **Permiso**: Autenticado
*   **Payload**:
    ```json
    {
      "old_password": "clave_actual",
      "new_password": "nueva_clave_segura"
    }
    ```

### 1.7 Solicitar Recuperación de Contraseña
*   **Endpoint**: `POST /api/auth/reset-verify/`
*   **Permiso**: Público
*   **Payload**:
    ```json
    {
      "cedula": "12345678"
    }
    ```
*   **Respuesta**: Envía un código OTP o token temporal al correo registrado del usuario.

### 1.8 Confirmar Nueva Contraseña
*   **Endpoint**: `POST /api/auth/reset-confirm/`
*   **Permiso**: Público
*   **Payload**:
    ```json
    {
      "cedula": "12345678",
      "token": "codigo_OTP",
      "new_password": "nueva_clave_segura"
    }
    ```

---

## 2. Módulo de Dashboard

### 2.1 Estadísticas del Dashboard
*   **Endpoint**: `GET /api/dashboard/stats/`
*   **Permiso**: Autenticado (Farmacia / Proveeduría / Directivos / Admin)
*   **Query Params**: `schema` (`farmacia` o `proveeduria`)
*   **Respuesta**: Resumen rápido de lotes activos, lotes próximos a vencer, vencidos y agotados, junto con datos para widgets del dashboard principal.

---

## 3. Módulo de Inventario y Semáforo (`/api/inventario/`)

### 3.1 Listar Lotes en Semáforo
*   **Endpoint**: `GET /api/inventario/`
*   **Permiso**: Autenticado (Lectura)
*   **Query Params**:
    *   `q`: Filtro de texto por nombre de medicamento o lote.
    *   `estado`: `OPTIMO`, `PROXIMO_A_VENCER`, `VENCIDO`, `AGOTADO`.
    *   `categoria`: ID de la categoría (farmacia).
    *   `presentacion`: ID de la presentación.
    *   `page`: Número de página (paginación backend).
*   **Respuesta**: Datos paginados desde `vista_semaforo_inventario`.

### 3.2 Listar Presentaciones con Lotes Activos
*   **Endpoint**: `GET /api/inventario/presentaciones/`
*   **Permiso**: Autenticado
*   **Propósito**: Obtener presentaciones de insumos que actualmente tengan stock.

### 3.3 Egreso Manual de Lote (Ajuste o Merma)
*   **Endpoint**: `POST /api/inventario/<int:pk>/egresar/`
*   **Permiso**: Farmacéutico o Superior / Proveeduría
*   **Payload**:
    ```json
    {
      "cantidad": 10,
      "motivo": "Daño / Vencimiento / Traslado"
    }
    ```
*   **Propósito**: Descontar stock manualmente registrando el egreso en la bitácora de auditoría.

### 3.4 Editar Lote (Precios / Ubicación)
*   **Endpoint**: `PUT /api/inventario/<int:pk>/editar/`
*   **Permiso**: Encargado o Superior
*   **Payload**: JSON con campos a modificar (`ubicacion`, `costo_unitario`, etc.).

---

## 4. Catálogo de Medicamentos Base (`/api/medicamentos/`)

### 4.1 Listar o Crear Medicamento Base
*   **Endpoint**: `GET` / `POST /api/medicamentos/`
*   **Permiso**: Autenticado (Escritura reservada a Directores/Admin)
*   **Payload (POST)**:
    ```json
    {
      "nombre_generico": "PARACETAMOL",
      "id_categoria": 1,
      "id_presentacion": 2,
      "componentes": [
        { "id_principio": 3, "concentracion_valor": "500", "id_unidad": 1 }
      ]
    }
    ```

### 4.2 Detalle, Editar o Inactivar Medicamento Base
*   **Endpoint**: `GET` / `PUT` / `DELETE /api/medicamentos/<int:pk>/`
*   **Permiso**: Administrador / Director
*   **DELETE (Soft-Delete)**: Inactiva el medicamento (`activo = false`) y lo envía a la papelera.

### 4.3 Verificar Duplicado de Medicamento
*   **Endpoint**: `POST /api/medicamentos/verificar-duplicado/`
*   **Permiso**: Autenticado
*   **Payload**: Estructura del medicamento a crear.
*   **Respuesta**:
    *   `existe_exacto: true` si hay un duplicado exacto activo.
    *   `existe_parcial: true` si comparte nombre genérico pero difieren componentes.

### 4.4 Consulta de Disponibilidad de Medicamentos (Integraciones Internas)
*   **Endpoint**: `POST /api/medicamentos/disponibilidad/`
*   **Permiso**: Libre (AllowAny) para integraciones institucionales.
*   **Cuerpo (Payload JSON - Opcional)**:
    ```json
    {
      "busqueda": "Acetaminofen",
      "categoria": "Analgésicos",
      "solo_disponibles": true
    }
    ```
*   **Respuesta (JSON)**:
    ```json
    [
      {
        "id_med_base": 64,
        "nombre_generico": "ACETAMINOFEN - BLISTER X 10 TAB.",
        "categoria": "ANALGÉSICOS",
        "presentacion": "BLISTER X 10 TAB.",
        "clasificacion": "CONTROLADO",
        "disponible": true,
        "componentes": [
          {
            "id_principio": 1,
            "nombre_principio": "ACETAMINOFEN",
            "concentracion_valor": 500,
            "id_unidad": 1,
            "nombre_unidad": "MG"
          }
        ]
      }
    ]
    ```

---

## 5. Catálogos Auxiliares (`/api/catalogos/`)

Permiten administrar las tablas paramétricas del sistema (Presentaciones, Categorías, Clasificaciones, Unidades, Tallas y Principios Activos).

*   **Presentaciones**: `GET` / `POST` / `PUT` / `DELETE /api/catalogos/presentaciones/` (y sub-rutas con `<int:pk>/`)
*   **Categorías**: `GET` / `POST` / `PUT` / `DELETE /api/catalogos/categorias/`
*   **Clasificaciones**: `GET /api/catalogos/clasificaciones/`
*   **Unidades de Medida**: `GET` / `POST` / `PUT` / `DELETE /api/catalogos/unidades/`
*   **Tallas / Calibres (Proveeduría)**: `GET /api/catalogos/tallas/`
*   **Principios Activos**: `GET` / `POST` / `PUT` / `DELETE /api/catalogos/principios-activos/`

---

## 6. Módulo de Dotación e Ingreso de Lotes (`/api/dotacion/`)

### 6.1 Registrar Lote Individual
*   **Endpoint**: `POST /api/dotacion/lotes/registrar/`
*   **Permiso**: Encargado o Superior / Proveeduría
*   **Payload**:
    ```json
    {
      "id_med_base": 5,
      "numero_lote": "LOT-9988",
      "cantidad_inicial": 200,
      "fecha_recepcion": "2026-06-16",
      "fecha_vencimiento": "2028-12-31",
      "costo_unitario": 0.50,
      "ubicacion": "ESTANTE B3"
    }
    ```

### 6.2 Historial de Recepciones (Ingresos)
*   **Endpoint**: `GET /api/dotacion/lotes/`
*   **Permiso**: Autenticado
*   **Query Params**: `desde`, `hasta`, `page`.

### 6.3 Listar Medicamentos Habilitados para Lote
*   **Endpoint**: `GET /api/dotacion/medicamentos/`
*   **Permiso**: Autenticado

### 6.4 Verificar Dotación Reciente
*   **Endpoint**: `GET /api/dotacion/verificar-reciente/<int:id_med_base>/`
*   **Permiso**: Autenticado
*   **Propósito**: Alerta si se ingresó el mismo medicamento en las últimas 24 horas para evitar duplicados accidentales.

### 6.5 Carga Masiva desde Plantilla (Excel/CSV)
*   **Endpoint**: `POST /api/dotacion/lotes/cargar-masivo/`
*   **Permiso**: Encargado o Superior
*   **Payload**: Form-Data con archivo adjunto (`file`) y booleano `confirmado`.
*   **Propósito**: Valida la planilla de forma exhaustiva y, si `confirmado` es `true`, realiza la inserción transaccional de los lotes.

### 6.6 Consultar Siguiente Número de Lote Secuencial
*   **Endpoint**: `GET /api/dotacion/lotes/siguiente-numero/`
*   **Permiso**: Operativo o Superior
*   **Query Params**: `schema` (`farmacia` o `proveeduria`).
*   **Respuesta**: `{ "siguiente_lote": "YYYY-XXXXXX" }` (ej: `2026-000088`).
*   **Propósito**: Busca en la base de datos el menor número entero positivo disponible para evitar duplicados y rellenar secuencias bajas, reiniciando cada año.

---

## 7. Módulo de Despacho (FEFO) (`/api/despacho/`)

### 7.1 Catálogo de Inventario Disponible para Despacho
*   **Endpoint**: `GET /api/despacho/buscar/`
*   **Permiso**: Farmacéutico o Superior
*   **Query Params**: `q` (búsqueda de texto)
*   **Respuesta**: Retorna **todos** los lotes activos (sin límite fijo de 20) ordenados bajo criterio FEFO (fecha de vencimiento más próxima primero).

### 7.2 Procesar Despacho a Beneficiario
*   **Endpoint**: `POST /api/despacho/procesar/`
*   **Permiso**: Farmacéutico o Superior
*   **Payload**:
    ```json
    {
      "cedula_beneficiario": "15667788",
      "nombre_beneficiario": "JUAN PEREZ",
      "parentesco_beneficiario": "HIJO",
      "titular_cedula": "9998887",
      "titular_nombre": "PEDRO PEREZ",
      "articulos": [
        { "id_lote": 12, "cantidad": 2 }
      ],
      "observaciones": "Tratamiento de 30 días",
      "medico_tratante": "Dr. Carlos Gómez",
      "especialidad": "Cardiología"
    }
    ```
*   **Propósito**: Valida stock, descuenta de forma atómica y congela datos del beneficiario y titular en `despachos_actas`.

### 7.3 Historial de Despachos Procesados
*   **Endpoint**: `GET /api/despacho/historial/`
*   **Permiso**: Autenticado
*   **Query Params**: `desde`, `hasta`, `cedula`, `folio`, `farmaceutico`, `page`.
*   **Bypass de Fechas**: Si se busca por `cedula` o `folio`, el rango de búsqueda se expande automáticamente a un año atrás del día de hoy.

### 7.4 Descargar Acta de Despacho en PDF
*   **Endpoint**: `GET /api/despacho/comprobante/<str:folio_grupo>/`
*   **Permiso**: Autenticado
*   **Respuesta**: Documento binario PDF (`application/pdf`) generado dinámicamente con las firmas e información institucional congelada.

---

## 8. WebServices e Integración de Personal (`/api/bienestar/`)

### 8.1 Consulta Centralizada de Cédulas (3 Niveles)
*   **Endpoint**: `GET /api/bienestar/<str:cedula>/`
*   **Permiso**: Autenticado
*   **Propósito**: Realiza la cascada de búsqueda en Bienestar Social:
    1.  WebService Viejo (GET)
    2.  WebService Nuevo (POST)
    3.  Mock Local JSON (Mecanismo de supervivencia)
*   **Respuesta**: Nombre, Cédula, Dependencia, Cargo del Titular y el listado de sus Cargas Familiares registradas.

---

## 9. Administración de Cuentas de Usuario (`/api/usuarios/`)

### 9.1 Listar o Crear Cuenta de Usuario
*   **Endpoint**: `GET` / `POST /api/usuarios/`
*   **Permiso**: Administrador
*   **Payload (POST)**: JSON de creación de usuario con cédula, nombres, rol y clave.

### 9.2 Detalle o Editar Cuenta de Usuario
*   **Endpoint**: `GET` / `PUT /api/usuarios/<int:pk>/`
*   **Permiso**: Administrador
*   **Restricción**: Valida que solo haya un rol `ADMINISTRADOR` y máximo un `DIRECTOR_SERVICIO_MEDICO` activo a la vez.

### 9.3 Habilitar o Inhabilitar Usuario
*   **Endpoint**: `POST /api/usuarios/<int:pk>/toggle-status/`
*   **Permiso**: Administrador
*   **Propósito**: Modifica `is_active` en la base de datos de seguridad.

### 9.4 Listar Roles del Sistema
*   **Endpoint**: `GET /api/usuarios/roles/`
*   **Permiso**: Administrador

### 9.5 Verificar Cédula en RRHH
*   **Endpoint**: `GET /api/usuarios/verificar/<str:cedula>/`
*   **Permiso**: Administrador
*   **Propósito**: Valida en el servicio externo si la cédula pertenece a un empleado activo de la DEM antes de crearle su cuenta.

### 9.6 Proxy SIGEFIRRHH
*   **Endpoint**: `GET /api/sigefirrhh/<str:cedula>/`
*   **Permiso**: Administrador

---

## 10. Reportes y Estadísticas Avanzadas (`/api/estadisticas/`)

*   **Resumen Numérico**: `GET /api/estadisticas/resumen/` (Tarjetas de dashboard consolidado).
*   **Datos de Gráfico de Inventario**: `GET /api/estadisticas/inventario-chart/` (Distribución de caducidades).
*   **Top Medicamentos Despachados**: `GET /api/estadisticas/top-medicamentos/`
*   **Evolución Temporal de Entregas**: `GET /api/estadisticas/evolucion/`
*   **Exportación a Excel / CSV**: `GET /api/estadisticas/exportar/`
*   **Reporte de Ingresos Detallados**: `GET /api/estadisticas/ingresos/`
*   **Inventario por Categoría**: `GET /api/estadisticas/inventario-categorias/`

---

## 11. Auditoría y Papelera (`/api/auditoria/`)

### 11.1 Medicamentos Inactivos (Papelera)
*   **Endpoint**: `GET /api/auditoria/bajas/medicamentos/`
*   **Permiso**: Administrador / Director

### 11.2 Lotes Inactivos / Desincorporados
*   **Endpoint**: `GET /api/auditoria/bajas/lotes/`
*   **Permiso**: Administrador / Director

### 11.3 Reactivar Elemento de la Papelera
*   **Endpoint**: `POST /api/auditoria/reactivar/`
*   **Permiso**: Administrador / Director
*   **Payload**:
    ```json
    {
      "tipo": "medicamento", // o "lote"
      "id": 45
    }
    ```

### 11.4 Bitácora de Auditoría General
*   **Endpoint**: `GET /api/auditoria/logs/`
*   **Permiso**: Auditor / Administrador
*   **Query Params**: `usuario`, `evento`, `desde`, `hasta`, `page`.

### 11.5 Exportar Bitácora a Archivo
*   **Endpoint**: `GET /api/auditoria/exportar/`
*   **Permiso**: Auditor / Administrador

---

## 12. Módulo de Proveeduría (`/api/proveeduria/`)

### 12.1 Inventario de Proveeduría (Material General)
*   **Endpoint**: `GET` / `POST /api/proveeduria/inventario/`
*   **Permiso**: Proveeduría o Superior
*   **Query Params**: `q`, `page`.

### 12.2 Detalle de Lote de Proveeduría
*   **Endpoint**: `GET` / `PUT` / `DELETE /api/proveeduria/inventario/<int:id_lote>/`
*   **Permiso**: Proveeduría o Superior

### 12.3 Requisiciones y Órdenes
*   **Endpoint**: `GET` / `POST /api/proveeduria/solicitudes/`
*   **Permiso**: Autenticado
*   **Payload (POST)**:
    ```json
    {
      "origen_id": 2, // ID Departamento Origen
      "destino_id": 1, // ID Departamento Destino
      "items": [
        { "id_med_base": 14, "cantidad": 50 }
      ],
      "observaciones": "Insumos mensuales"
    }
    ```

### 12.4 Detalle de Requisición
*   **Endpoint**: `GET /api/proveeduria/solicitudes/<int:id_solicitud>/`
*   **Permiso**: Autenticado

### 12.5 Procesar / Entregar Requisición
*   **Endpoint**: `POST /api/proveeduria/solicitudes/<int:id_solicitud>/procesar/`
*   **Permiso**: Rol Destino Autorizado (Ej: Proveeduría o Farmacéutico)
*   **Payload**:
    ```json
    {
      "estado": "ENTREGADA", // o "RECHAZADA"
      "motivo_rechazo": "Falta de justificación", // En caso de rechazo
      "items_procesados": [
        { "id_solicitud_detalle": 45, "cantidad_entregada": 50, "id_lote": 8 }
      ]
    }
    ```
*   **Propósito**: Valida la requisición, descuenta stock de la procedencia y crea el stock en destino si es una requisición entre almacenes internos, o procesa salida directa si es hacia un departamento externo (ej: TEPUY).

### 12.6 Acta de Solicitud en PDF
*   **Endpoint**: `GET /api/proveeduria/solicitudes/<int:id_solicitud>/pdf/`
*   **Permiso**: Autenticado
*   **Respuesta**: Documento PDF generado dinámicamente incluyendo las firmas de origen/destino y las observaciones o motivos de rechazo correspondientes.

### 12.7 Departamentos Registrados
*   **Endpoint**: `GET` / `POST` / `PUT` / `DELETE /api/proveeduria/departamentos/` (y sub-rutas con `<int:pk>/`)
*   **Permiso**: Administrador / Director

