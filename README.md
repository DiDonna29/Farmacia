# Sistema Integral de Salud y Asistencia Pública (SIFARMA - DEM)
## Módulo de Farmacia y Proveeduría

![Estado](https://img.shields.io/badge/Estado-Producción-success.svg)
![Versión](https://img.shields.io/badge/Versión-2.0.0-blue.svg)

El Sistema de Control de Farmacia y Proveeduría (SIFARMA) es una solución integral diseñada para la Dirección Ejecutiva de Magistratura (DEM) enfocada en la gestión eficiente, segura y trazable del inventario médico y general.

## 🚀 Características Principales

*   **Doble Motor de Inventario Aislado**:
    *   **Farmacia**: Inventario de medicamentos administrado por Farmacéuticos, organizado por Lotes, Principios Activos y Presentaciones.
    *   **Proveeduría**: Inventario general (material médicoquirúrgico, insumos de oficina, etc.) administrado por el equipo de Proveeduría.
*   **Gestión Inteligente de Lotes y Caducidad**:
    *   Semáforo de Caducidad automatizado (`ÓPTIMO`, `PRÓXIMO A VENCER`, `VENCIDO`, `AGOTADO`).
    *   Notificaciones predictivas para evitar el vencimiento del stock.
*   **Solicitudes y Requisiciones Cruzadas (NUEVO)**:
    *   Motor de solicitudes que permite a departamentos internos y foráneos solicitar material.
    *   Reglas lógicas que previenen el cruce accidental de solicitudes (ej. Farmacia no puede auto-solicitarse).
    *   Seguridad por Roles: Solo los `Administradores` y `Directores de Servicio Médico` pueden sobreescribir destinos; el resto del personal está restringido a sus competencias directas.
*   **Integración de WebServices Externos (NUEVO)**:
    *   Sincronización en tiempo real con la API Institucional para la captura automática de datos del Personal Titular y sus Cargas Familiares.
    *   Asignación automática de despachos a beneficiarios manteniendo el enlace de responsabilidad con el titular.
*   **Seguridad Basada en Roles (RBAC)**:
    *   Manejo estricto de accesos para `ADMINISTRADOR`, `DIRECTOR_SERVICIO_MEDICO`, `ENCARGADO`, `FARMACEUTICO`, `PROVEEDURIA`, y `AUDITOR`.
*   **Carga Masiva de Lotes Optimizada**:
    *   Subida de inventario inicial o reabastecimientos mediante plantillas Excel (`.xlsx`).
    *   Motor de validación estricto en el Backend (evita cantidades negativas, textos inválidos, previene inyección de datos corruptos).
*   **Interfaz de Usuario Premium (UI/UX)**:
    *   Implementación de Skeletons Loaders predictivos que replican la estructura final de los datos para una carga fluida.
    *   Uso de Toasts no intrusivos de SweetAlert para prevenir el bloqueo visual durante las peticiones asíncronas.
*   **Auditoría y Reportes en PDF**:
    *   Generación instantánea de actas de recepción, comprobantes de dotación, y despachos directamente en PDF (ReportLab).
    *   Trazabilidad completa de cada acción que afecta el inventario (movimientos de entrada/salida).
*   **Scripts de Despliegue Automatizado**:
    *   Herramientas como `start_app.ps1` que configuran automáticamente el entorno virtual, instalan dependencias y enlazan Angular con Django de forma dinámica.

## 🛠 Arquitectura Tecnológica

El sistema sigue una arquitectura moderna Desacoplada (Frontend/Backend):

### Backend (API REST)
*   **Framework**: Django & Django REST Framework (DRF)
*   **Base de Datos**: PostgreSQL 16
*   **Autenticación**: JWT (JSON Web Tokens)
*   **Reportes**: ReportLab (Generación de PDF)

### Frontend (SPA)
*   **Framework**: Angular 21
*   **Estilos**: Bootstrap 5 + CSS Modular
*   **Iconografía**: FontAwesome 6
*   **Estado**: RxJS y Signals

## 📦 Estructura del Repositorio

- `/backend`: Contiene la lógica de negocio, configuración de base de datos, APIs y scripts de migración (`/backend/scripts`).
- `/frontend`: Contiene la aplicación web cliente, componentes visuales, servicios y guardas de seguridad.
- `/documentacion`: (Archivos MD en la raíz) Contienen toda la información de despliegue, configuración y manuales de usuario.

---

## 📚 Documentación Adjunta

*   [Guía para Desarrolladores](README_DEV.md) - Cómo levantar el entorno local, ejecutar pruebas y modificar el código.
*   [Instrucciones de Configuración y Despliegue](INSTRUCCIONES_CONFIGURACION.md) - Pasos detallados para montar la aplicación en un servidor de Producción (Linux/Windows).
*   [Manual de Usuario](MANUAL_USUARIO.md) - Guía completa orientada al personal de Farmacia, Proveeduría y Directivos sobre cómo usar la aplicación.
*   [Manual del Frontend](MANUAL_FRONTEND.md) - Documentación explícita sobre la lógica del lado del cliente, componentes Standalone y ciclo de renderizado.
*   [Manual del Backend](MANUAL_BACKEND.md) - Detalles de la base de datos multiesquema, algoritmos FEFO, transacciones de stock e integraciones.
*   [Diccionario de APIs y Endpoints](DOCUMENTACION_APIS.md) - Listado y especificación técnica de todas las peticiones HTTP y payloads del sistema.
*   [Mapa del Agente (Reglas de Negocio)](agent.md) - Diagrama mental detallado de la lógica transaccional, vistas en SQL y cruce de validaciones.

---

**© 2026 Dirección Ejecutiva de Magistratura (DEM)**. Todos los derechos reservados.

