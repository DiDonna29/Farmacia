# MANUAL DE NORMAS Y PROCEDIMIENTOS DEL Sistema de Inventario de Farmacia (SIFARMA)

---

## I. INTRODUCCIÓN

El presente Manual de Normas y Procedimientos del **Sistema de Inventario de Farmacia (SIFARMA)** ha sido elaborado por la **Oficina de Desarrollo Informático** en coordinación con la **Oficina de Servicio Médico** de la Dirección Ejecutiva de la Magistratura (DEM). Este documento constituye una herramienta de control, organización y metodología de cumplimiento obligatorio para todo el personal adscrito que interactúa con la plataforma. Su finalidad es regular, normalizar y unificar los procesos administrativos y tecnológicos que comprenden el registro de insumos, el control de stock mediante semaforización, las solicitudes interdepartamentales y la dispensación de insumos médicos al personal de la Dirección Ejecutiva de la Magistratura (DEM) y sus cargas familiares.

---

## II. OBJETIVO

Establecer las normas, responsabilidades e instructivos secuenciales de los procedimientos que regulan el funcionamiento del **SIFARMA**, garantizando la disponibilidad, integridad y confidencialidad de la información del almacén de salud, la trazabilidad de los despachos a beneficiarios institucionales y la transparencia en las operaciones de dotación.

---

## III. BASE LEGAL

El funcionamiento y resguardo de la información en el SIFARMA se fundamenta en el marco legal vigente de la República Bolivariana de Venezuela:
1. **Constitución de la República Bolivariana de Venezuela**: Gaceta Oficial N° 5.453 Extraordinario del 24/03/2000.
2. **Ley Especial Contra los Delitos Informáticos**: Gaceta Oficial N° 37.313 del 30/10/2001 (Regula el acceso indebido, sabotaje y alteración de sistemas protegidos).
3. **Ley Sobre Mensajes de Datos y Firmas Electrónicas**: Gaceta Oficial N° 37.148 del 28/02/2001 (Da validez jurídica a los comprobantes e históricos firmados digitalmente).
4. **Ley Orgánica de la Administración Pública**: Gaceta Oficial N° 5.890 Extraordinario del 31/07/2008 (Establece los principios de eficiencia, simplificación de trámites y transparencia).
5. **Ley Orgánica de la Contraloría General de la República y del Sistema Nacional de Control Fiscal**: Gaceta Oficial Extraordinaria N° 6.013 del 23/12/2010.
6. **Normas Generales de Control Interno**: Gaceta Oficial N° 36.229 del 17/06/1997 (Obligatoriedad del registro de auditorías y resguardo de bitácoras de transacciones).

---

## IV. NORMAS GENERALES Y DE SEGURIDAD

### De los Módulos Compartidos e Interacción de Roles
1. El SIFARMA es una aplicación multiusuario estructurada bajo el control de acceso basado en roles (RBAC).
2. **Uso Compartido de Módulos**: Múltiples perfiles de usuario acceden y comparten los mismos módulos del sistema, restringiendo sus acciones dinámicamente según su nivel de competencia:
   * **Módulo de Inventario**: Compartido por el *Farmacéutico* (control minorista y dispensación del dispensario), el *Operativo de Proveeduría* (gestión mayorista del almacén a granel), y el *Encargado* (quien posee privilegios cruzados de supervisión y gestión operativa en ambos inventarios). Aunque acceden a la misma interfaz, las acciones de dotación manual y traslado están limitadas a su respectiva competencia. El *Auditor* y el *Director* acceden a este módulo en modalidad exclusiva de **Sólo Lectura**.
   * **Módulo de Solicitudes y Requisiciones**: Compartido bidireccionalmente entre *Farmacia* (emisor de órdenes de reabastecimiento), *Proveeduría* (receptor y despachador mayorista), y el *Encargado* (quien supervisa y autoriza operaciones en ambos departamentos de forma combinada). El flujo de aprobaciones y motivo de rechazos se comunica en tiempo real a través del cambio de estados de la orden.
   * **Módulo de Bitácora (Logs de Eventos)**: Compartido por el *Administrador* (gestión de seguridad y usuarios), el *Director* (seguimiento gerencial) y el *Auditor* (control fiscal de inhabilitaciones de lotes dañados).
3. **Seguridad Lógica de Cuentas y Contraseñas y Control de Usuarios**:
   * Las cuentas de usuario son de uso personal e intransferible.
   * Los administradores y los encargados poseen la capacidad de registrar, editar y desactivar cuentas de usuarios según su jerarquía de permisos (el *Encargado* tiene permitido administrar al personal de *Farmacéuticos* y de *Proveeduría*).
   * Las contraseñas deben poseer una longitud mínima de ocho (8) caracteres, combinando letras mayúsculas, minúsculas, números y símbolos especiales.
   * De ocurrir **cinco (5) intentos fallidos de autenticación**, la clave de usuario será bloqueada preventivamente y la cuenta será desactivada.
   * Las contraseñas de acceso deben ser actualizadas forzosamente por los usuarios en un lapso no mayor a noventa (90) días.

---

## V. PROCEDIMIENTOS DETALLADOS (Paso a Paso)

### 5.1. Procedimiento para el Inicio de Sesión y Recuperación de Credenciales
**Objetivo**: Describir los pasos para la autenticación y reestablecimiento seguro de credenciales en el sistema.

| Responsable | Paso | Acción |
| :--- | :---: | :--- |
| **Cualquier Funcionario** | **1** | Ingresa a la interfaz de acceso `http://SIFARMA.dem.int/login`, escribe su Cédula (ej: `11456789`) y contraseña, y pulsa "Iniciar Sesión". |
| **Sistema (Backend)** | **2** | Evalúa la autenticidad del token JWT. Si es válido, redirige al Dashboard y habilita el menú según el Rol. Si detecta 5 fallos, desactiva la cuenta. |
| **Funcionario** (En caso de olvido) | **3** | Hace clic en "¿Olvidó su contraseña?", introduce su cédula y correo institucional y hace clic en "Enviar". |
| **Sistema** | **4** | Valida la coincidencia y remite un token seguro temporal al correo institucional para forzar el cambio de clave. |

---

### 5.2. Procedimiento para la Creación y Gestión de Usuarios (CRUD)
**Objetivo**: Registrar y parametrizar las cuentas de acceso del personal de salud en la plataforma.

| Responsable | Paso | Acción |
| :--- | :---: | :--- |
| **Administrador** | **1** | Se dirige a **Mantenimiento > Usuarios** en el menú de navegación y pulsa **"Nuevo Usuario"**. |
| **Administrador** | **2** | Digita la cédula de identidad del funcionario en el campo de consulta del WebService y hace clic en buscar. |
| **Sistema** | **3** | Realiza una petición interna (evitando el proxy Squid de la red) al servidor de Recursos Humanos, recupera el nombre y apellido completos del trabajador y bloquea dichos campos en formato de sólo lectura. |
| **Administrador** | **4** | Configura el correo electrónico del usuario, le asigna el **Rol** operativo y hace clic en **"Guardar"**. |

---

### 5.3. Procedimiento para la Creación y Registro de Medicamentos en el Catálogo
**Objetivo**: Mantener actualizado el catálogo nacional de medicamentos e insumos médicos base.

| Responsable | Paso | Acción |
| :--- | :---: | :--- |
| **Administrador** | **1** | Accede a **Mantenimiento > Catálogo** en la barra lateral y hace clic en **"Agregar Insumo"**. |
| **Administrador** | **2** | Escribe el Nombre Genérico del insumo. El sistema valida duplicidades en segundo plano. |
| **Sistema** | **3** | Responde e interrumpe según la coincidencia:<br>- **Coincidencia Exacta**: Muestra advertencia e impide el registro.<br>- **Coincidencia Parcial**: Abre modal de variantes para guiar la selección del registro idóneo. |
| **Administrador** | **4** | Selecciona los parámetros del componente. Si la unidad de medida no se encuentra listada, elige la opción **"OTRO"** e introduce la descripción de texto. El sistema asienta el nuevo registro en la base de datos automáticamente. |

---

### 5.4. Procedimiento para la Carga Masiva de Lotes de Medicamento (Excel)
**Objetivo**: Incorporar múltiples lotes de insumos de forma rápida mediante formato estandarizado.

| Responsable | Paso | Acción |
| :--- | :---: | :--- |
| **Farmacéutico / Operativo** | **1** | Se dirige a **Mantenimiento > Carga Masiva** en el menú lateral y hace clic en **"Descargar Formato Excel"**. |
| **Farmacéutico / Operativo** | **2** | Rellena la hoja de cálculo respetando el límite máximo de **20.000 unidades** por fila y las especificaciones del manual. |
| **Farmacéutico / Operativo** | **3** | Sube el archivo `.xlsx` en la zona de importación de la interfaz. |
| **Sistema** | **4** | Analiza fila por fila. Si detecta discrepancias de nombres o presentaciones con el Catálogo, rechaza el archivo y detalla los errores recomendando variantes válidas registradas. |
| **Farmacéutico / Operativo** | **5** | Si la previsualización no reporta errores, presiona **"Confirmar Carga"** para asentar los lotes en el inventario. |

---

### 5.5. Procedimiento para el Despacho y Entrega de Medicamentos a Pacientes
**Objetivo**: Atender solicitudes médicas de los trabajadores de la institución y sus cargas familiares.

| Responsable | Paso | Acción |
| :--- | :---: | :--- |
| **Farmacéutico** | **1** | Abre el módulo **Despachos > Nuevo Despacho** e ingresa la cédula del beneficiario titular (ej: `11456789`). |
| **Sistema** | **2** | Valida la cédula de forma directa con el servicio de Bienestar Social (bypasseando el proxy de red local) e importa los datos del empleado y su lista de familiares. |
| **Farmacéutico** | **3** | Selecciona si el medicamento es para el **Titular** o para una **Carga Familiar** específica en el menú desplegable. |
| **Farmacéutico** | **4** | Agrega los medicamentos al carrito, define las cantidades indicadas (máximo 20.000 unidades) y asocia los lotes (los lotes marcados en rojo/Vencidos se encuentran bloqueados por sistema). |
| **Farmacéutico** | **5** | Presiona **"Procesar Despacho"**. El sistema descuenta el stock en tiempo real y genera el acta. |
| **Farmacéutico** | **6** | Descarga e imprime el **Comprobante de Despacho (Acta PDF)** firmado, que incorpora logotipos institucionales decodificados en Base64 en memoria para respaldo físico de la farmacia. |

---

### 5.6. Procedimiento para la Tramitación de Solicitudes y Requisiciones de Almacén
**Objetivo**: Reabastecer stock de farmacia o autorizar salidas de material a dependencias externas.

| Responsable | Paso | Acción |
| :--- | :---: | :--- |
| **Farmacéutico** (Solicitante) | **1** | Accede a **Solicitudes > Crear Solicitud**, define Origen: `FARMACIA`, Destino: `PROVEEDURIA`, añade los insumos requeridos (máximo 20.000 unidades) y presiona **"Enviar"**. |
| **Operativo de Proveeduría** | **2** | Abre el módulo de **Solicitudes y Requisiciones** y localiza la orden. *(Opcional: presiona el botón rápido "Otros" para aislar y tramitar solicitudes externas de entes que no manejan stock propio como TEPUY).* |
| **Operativo de Proveeduría** | **3** | Hace clic en **"Procesar"** y evalúa la orden:<br>- **Aprobar**: Selecciona el lote mayorista de salida y pulsa **"Entregar Solicitud"**. El stock migra a la farmacia automáticamente.<br>- **Rechazar**: Presiona **"Rechazar"**, ingresa obligatoriamente el **Motivo de Rechazo** en el modal y pulsa **"Confirmar"**. |
| **Sistema** | **4** | Registra el motivo de rechazo en la base de datos concatenado a las observaciones y actualiza el acta PDF inyectando una tarjeta visual con el justificativo del rechazo. |

---

## VI. FORMULARIOS E INSTRUCTIVOS DEL SISTEMA

Los reportes y actas generados por el SIFARMA constituyen documentos institucionales formales:
1. **Comprobante de Despacho al Personal (Acta PDF)**:
   * Emitida automáticamente por el sistema al procesar una entrega.
   * Renderiza el logotipo de la DEM a la izquierda y el de SIFARMA a la derecha de forma segura utilizando Base64 directamente desde la memoria del servidor.
   * Contiene firmas digitales de los responsables y el desglose de medicamentos retirados.
2. **Acta de Solicitud de Reabastecimiento de Insumos**:
   * Documento formal que certifica la dotación interna o el rechazo justificado de un pedido de Farmacia a Proveeduría.

---

## VII. DEFINICIÓN DE TÉRMINOS

*   **Administrador**: Funcionario del área informática con privilegios absolutos para configurar seguridad, registrar cuentas de usuario y mantener el catálogo maestro.
*   **Auditor**: Funcionario encargado de velar por el control fiscal de la farmacia analizando los registros del almacén y la bitácora en modo de sólo lectura.
*   **Bypass de Proxy**: Configuración técnica a nivel de código (`proxies={"http": None, "https": None}`) para forzar que el sistema consulte los servicios de red locales eludiendo el servidor proxy Squid.
*   **Director**: Funcionario con rol de supervisión médica que evalúa gráficas de consumo de medicamentos y reportes de existencias.
*   **Encargado**: Funcionario con perfil de supervisión interdepartamental que posee privilegios combinados para gestionar operativamente el catálogo, realizar dotaciones y autorizar/despachar solicitudes tanto de la Farmacia Central como del almacén de Proveeduría, además de poseer control sobre la inhabilitación y activación de cuentas de usuario de ambos departamentos.
*   **Semaforización**: Clasificación visual y lógica de los lotes de medicamento según su fecha de vencimiento: Verde (Vigente), Amarillo (Próximo a vencer, menos de 90 días) y Rojo (Vencido, inhabilitado para despacho).
*   **SimpleJWT**: Estándar de seguridad para la autenticación y encriptación de datos de sesión.
*   **WebService**: Servicio web institucional que permite la consulta y validación inmediata de cédulas de identidad con las bases de datos de Recursos Humanos.

