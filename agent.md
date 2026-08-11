# Mapa Mental y Reglas del Agente (agent.md)

Este documento centraliza el conocimiento profundo sobre la lógica arquitectónica y las reglas de negocio críticas implementadas en el sistema. Debe usarse como referencia por desarrolladores o inteligencias artificiales para entender cómo funcionan las piezas maestras.

## 1. Arquitectura de Base de Datos (PostgreSQL)

El sistema opera sobre un principio estricto de **Schemas Separados**:
- `farmacia`: Todas las tablas relacionadas a medicamentos, principios activos, catalogos de presentación, y los `lotes` de farmacia.
- `proveeduria`: Tablas dedicadas exclusivamente al control de `lotes` de material médico general y requerimientos institucionales.
- `auth` (Por defecto en Django): Manejo de usuarios, sesiones y roles de perfil (`api_userprofile`).

### Las Vistas SQL (Crucial)
Las consultas de listado de inventario **NO** se hacen cruzando ORM puro de Django. En su lugar, el sistema depende de la vista `vista_semaforo_inventario`.
Existen DOS vistas gemelas, una en `proveeduria.vista_semaforo_inventario` y otra en `farmacia.vista_semaforo_inventario`.
La lógica de los "Semáforos" de vencimiento y de empaquetado de JSON para principios activos está embebida en el SQL del motor PostgreSQL por cuestiones de rendimiento masivo.

### Congelamiento e Inmutabilidad del Historial
La tabla `farmacia.despachos_actas` cuenta con las columnas nativas `cedula_titular` (`bigint`) y `nombre_titular` (`text`) para registrar un snapshot del Titular Responsable en el momento de procesarse el despacho. Esto evita re-consultas redundantes al WebService de Bienestar Social en listados históricos y previene que caídas del servicio externo o cambios en la base de datos de personal dañen la fidelidad de las actas y comprobantes PDF.

> **Advertencia de Despliegue:** 
> Nunca utilices `python manage.py migrate` como única fuente de verdad para la DB. Debes correr `python scripts/run_migrations.py` (o `python setup_production.py` en entornos de producción) para asegurar que las vistas SQL sean inyectadas al motor y las columnas de inmutabilidad estén creadas.

## 2. Motor de Solicitudes y Requisiciones (Validaciones)

El módulo de "Solicitudes" es el punto de cruce entre Farmacia y Proveeduría. 

### Reglas RBAC (Role-Based Access Control) aplicadas en el Frontend:
1. **Administradores y Directores**: Poseen total libertad. Tienen habilitados los Selectores de `Origen` y `Destino`, pero la lógica estricta dicta que NO pueden colocar Origen == Destino.
2. **Proveeduría / Farmacia / Encargados**:
   - Para Farmacia: El `Destino` se clava automáticamente en `FARMACIA` y se desactiva visualmente el dropdown `[disabled]="true"`. Solo pueden decidir de dónde viene el requerimiento (ej. `OTRO` u otros departamentos).
   - Para Proveeduría: El `Destino` es automáticamente `PROVEEDURIA`.
3. **Limpieza del Buffer (`items temporales`)**:
   - En el `solicitudes.component.ts`, cualquier evento `(change)` en los selects de Origen o Destino dispara una alerta de vaciado. Esto es vital para evitar que un usuario liste medicamentos de farmacia, cambie el select a Proveeduría, y envíe un payload corrupto al backend.

### Buscador Múltiple Interactivo
El buscador implementa búsqueda dividida (`split(' ')`). Si un usuario digita `paracetamol blister`, el sistema buscará de manera desordenada que "paracetamol" exista en la cadena y que "blister" exista, permitiendo búsquedas naturales.

### Despachos a Departamentos Externos (Sin Inventario Propio)
El backend implementa lógica inteligente en `proveeduria_views.py` (`ProcesarSolicitudView`) para evaluar si el departamento solicitante (`origen`) posee un esquema de inventario gestionado en el sistema (identificado si su nombre contiene las subcadenas `'FARM'` o `'PROV'`):
1. **Descuento de Stock**: Se descuentan las cantidades entregadas de los lotes del almacén que provee (`destino`).
2. **Omisión de Carga**: Se omite la creación de lotes de transferencia en el destino si el solicitante no es un almacén interno (ej. `TEPUY`), previniendo inyecciones de stock virtual fantasma.
3. **Registro de Auditoría**: La solicitud se marca como `ENTREGADA` y se registran 3 niveles de trazas en la bitácora:
   - Registro individual de `EGRESO` en el inventario correspondiente.
   - Evento global de tipo `SOLICITUD_PROCESADA` resumiendo las transacciones.
   - Evento de tipo `DESPACHO` en la bitácora (`auditoria_logs`) con el detalle exacto del egreso hacia el departamento externo.

## 3. Reglas de Negocio en la Gestión de Usuarios
Para mantener la integridad organizacional y de roles del sistema, se imponen restricciones en la creación, edición y activación de usuarios en `usuarios_views.py`:

- **Administrador Único (Incondicional):**
  - Solo se permite la existencia de un usuario con el rol `ADMINISTRADOR` (activo o inactivo) en toda la base de datos.
  - No está permitido desactivar al Administrador principal.
  
- **Director de Servicio Médico Único (Activo):**
  - Se pueden tener múltiples usuarios creados con el rol `DIRECTOR_SERVICIO_MEDICO` (por ejemplo, directores anteriores inactivos por desincorporación o despido).
  - Sin embargo, **solo un Director de Servicio Médico puede estar ACTIVO (`is_active = True`)** al mismo tiempo en el sistema.
  - Al crear, editar (si el rol destino es director y el usuario está activo) o activar a un usuario con el rol `DIRECTOR_SERVICIO_MEDICO`, el sistema valida si ya existe otro activo. De ser así, bloquea la operación con un mensaje indicando al administrador que primero se debe inhabilitar al actual.

## 4. Manejo de Fechas y Zonas Horarias
- Las fechas se procesan siempre en formato ISO (`YYYY-MM-DD`). 
- El backend Django (`timezone.now()`) asume manejo UTC por defecto en DB, pero los cálculos de "Semáforo" (Ej: `CURRENT_DATE + '4 mons'::interval`) se resuelven a nivel de PostgreSQL según el reloj nativo del servidor DB.

## 5. Estilos y Estética UI (Regla de Oro)
Toda modificación visual debe mantenerse sobre Bootstrap 5, pero utilizando los esquemas de color profundos y *glassmorphism* (oscuros / azulados). No se usan diseños planos (MVP).
- Encabezados de Modales deben usar `bg-primary text-white`.
- Los paginadores están programados lógicamente para mostrar un máximo de 5 páginas relativas para que la UI no colapse en inventarios masivos.
- Las tablas en modales flotantes (`table-responsive`) deben estar encapsuladas en `divs` de tamaño fijo (`height: 415px; overflow-y: auto`) para evitar el efecto elástico en la UI durante los filtrados rápidos.
