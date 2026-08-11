# Integración con WebService de Bienestar Social

## 🎯 Objetivo
El objetivo principal de este módulo es garantizar la identificación precisa y en tiempo real de los empleados (Titulares) y sus cargas familiares (Beneficiarios) que hacen uso de la Farmacia y Proveeduría de la DEM. Esta integración elimina la necesidad de mantener una base de datos de empleados redundante, conectándose directamente con el sistema central de Bienestar Social para obtener datos actualizados (Cédula, Nombres, Dependencia, Parentesco, etc.).

## 🚀 El Fin Deseado
1. **Identificación Transparente:** Al buscar una cédula en el submódulo de despacho, el sistema debe consultar automáticamente la API externa, identificar si la cédula pertenece a un titular o a su carga familiar, y presentar la información completa para proceder con el despacho.
2. **Inmutabilidad del Historial:** Garantizar que, una vez que los medicamentos son entregados, el Acta de Despacho conserve un registro "congelado" de quién fue el Titular Responsable y quién fue el Beneficiario Final en ese momento exacto del tiempo. Esto previene que alteraciones futuras en el WebService (o caídas del sistema externo) corrompan el historial médico y las impresiones PDF de la farmacia.

## 🛠️ Lo Realizado (Arquitectura Implementada)

Para lograr un sistema robusto, a prueba de fallos y con inmutabilidad de datos, se construyó la siguiente arquitectura:

1. **Cascada de Búsqueda de 3 Niveles (Frontend/Buscador):**
   Se implementó un patrón Proxy en el backend para buscar a las personas siguiendo un orden de prioridad:
   - **Nivel 1:** Intenta contactar la API de **Bienestar Viejo** vía `GET` (`BIENESTAR_ACTUAL_URL`).
   - **Nivel 2:** Intenta contactar la API de **Bienestar Nuevo** vía `POST` (`BIENESTAR_FUTURO_URL`), la cual soporta el formato de lista/exportación y busca mediante un payload JSON de cédula.
   - **Nivel 3:** Fallback (Modo Supervivencia). Si los servidores externos caen, lee un Mock JSON local para seguir operando.

2. **Captura y Envío de Metadatos (Frontend):**
   Al momento de procesar la entrega, el cliente Angular empaqueta no solo los datos del Beneficiario que recibe la medicina, sino que **extrae y adjunta explícitamente los datos de su Titular** (Cédula y Nombre Completo) para enviarlos como una "fotografía" de ese instante.

3. **Inmutabilidad en Base de Datos (PostgreSQL):**
   La tabla `despachos_actas` fue alterada para poseer las columnas nativas `cedula_titular` y `nombre_titular`. De este modo, los datos viajan desde el frontend y quedan sellados permanentemente en la base de datos de Farmacia sin depender nunca más del WebService externo para ese despacho en específico.

4. **Desacoplamiento del Historial y PDFs:**
   La generación de PDFs (`GenerarComprobantePDFView`) utiliza como fuente primaria los valores congelados `cedula_titular` y `nombre_titular` de la base de datos local. Las llamadas dinámicas complementarias al WebService se realizan con la cédula del titular únicamente para obtener metadatos accesorios (teléfono, correo, dependencia, cargo). Se ha restringido este enriquecimiento de modo que no sobreescriba el nombre del beneficiario o su parentesco, garantizando actas correctas y sin "N/A" para cargas familiares.

---

## 🔧 Resolución de Problemas y Mantenimiento

En caso de que la obtención de los datos de los usuarios comience a fallar (por ejemplo, si Bienestar Social cambia la estructura de su JSON o si los servidores cambian de IP), aquí están las instrucciones precisas para depurarlo:

### Archivos Críticos a Verificar

1. **El Archivo de Entorno (`backend/.env`):**
   - **Propósito:** Controla las URLs a las que el sistema intentará conectarse.
   - **Qué hacer:** Verifica que las variables `BIENESTAR_FUTURO_URL` o `BIENESTAR_ACTUAL_URL` apunten a los servidores y puertos correctos (Ej: `http://172.26.98.98:9001/api/buscar-empleado/`).

2. **Vista de Búsqueda Activa (`backend/api/views/bienestar_views.py`):**
   - **Propósito:** Es la compuerta que recibe la orden de buscar un empleado y ejecuta la "Cascada de 3 Niveles".
   - **Qué hacer:** En este archivo se encuentra la función `normalizar_datos_bienestar(raw_data)`. Si la API de Bienestar Social cambia la nomenclatura de sus atributos, se edita aquí. Mapea la clave `"cargo_descripcion"` como origen primario para el cargo e implementa los valores por defecto `"BIENESTAR SOCIAL"` para dependencia y `"FUNCIONARIO"` para cargo si el WebService responde con valores nulos.

3. **Utilidad de Ingesta de Datos (`backend/api/utils/__init__.py`):**
   - **Propósito:** Contiene la función `fetch_bienestar_data(cedula)`. Es la lógica de respaldo (salvavidas) que se utiliza si se necesita re-consultar a una persona a nivel de sistema.
   - **Qué hacer:** Si ves errores de "N/A" en despachos *antiguos*, revisa aquí. Esta función cuenta con el mismo mapeo preferente de `"cargo_descripcion"` y fallbacks de seguridad (`"BIENESTAR SOCIAL"` y `"FUNCIONARIO"`) ante campos vacíos, de modo que el PDF se construya correctamente sin campos en blanco.

4. **Despachador del Frontend (`frontend/src/app/features/despacho/despacho.component.ts`):**
   - **Propósito:** Une los datos en la pantalla y los prepara para el envío final.
   - **Qué hacer:** Busca la función `procesarDespacho()`. Aquí es donde se construye el paquete o Payload JSON. Asegúrate de que las variables `titular_cedula` y `titular_nombre` sigan apuntando correctamente al objeto `this.titularEncontrado`.

### Pasos Rápidos ante un Fallo Generalizado

Si la red de la institución colapsa o la API real de Bienestar muere por días y necesitas seguir despachando medicamentos:
1. Asegúrate de tener copias de los usuarios en `backend/api/mocks/bienestar_mock.json`.
2. Comenta (pon un `#` adelante) las variables `BIENESTAR_FUTURO_URL` y `BIENESTAR_ACTUAL_URL` en tu archivo `.env`.
3. Reinicia el servidor. Al no encontrar URLs válidas, el sistema activará instantáneamente su mecanismo de supervivencia y comenzará a usar el archivo local `.json` de forma transparente para los farmaceutas.
