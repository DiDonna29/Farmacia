# SISAP - Backend (API REST)

Este directorio contiene el backend y la lógica de negocio del **Sistema de Inventario de Salud y Abastecimiento al Personal (SISAP)**.

## 🛠️ Tecnologías y Configuración
El backend está construido con:
*   **Django 5.0.4** y **Django REST Framework (DRF)**.
*   **PostgreSQL 14+** como motor de base de datos relacional (con segmentación de esquemas).
*   **SimpleJWT** para autenticación mediante tokens JWT.
*   **ReportLab** y **OpenPyXL** para la generación de reportes PDF y hojas de cálculo.

## 📂 Guías del Desarrollador y Configuración
Para detalles de instalación local y despliegue:
*   Consulte la [Guía de Desarrollo del Backend](README_DEV.md) para detalles de la arquitectura, esquemas de bases de datos y scripts de mantenimiento.
*   Consulte las [Instrucciones de Configuración y Despliegue](../INSTRUCCIONES_CONFIGURACION.md) en la raíz del proyecto para ver cómo montar la aplicación en producción.

## 🚀 Scripts Útiles
*   `python setup_production.py`: Configura los esquemas de bases de datos de PostgreSQL, carga la permisología base de roles y crea las cuentas administrativas iniciales en entornos limpios.
*   `python scripts/run_migrations.py`: Ejecuta las migraciones de Django y recrea las vistas SQL del semáforo en la base de datos.
