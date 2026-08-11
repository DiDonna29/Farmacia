# 💻 Guía de Desarrollo: Frontend (Angular 21)

Este documento proporciona una visión técnica detallada sobre la arquitectura, diseño y patrones del frontend del **Sistema de Inventario de Farmacia (SIFARMA)**.

---

## 🛠️ Stack Tecnológico
*   **Framework**: Angular 21 (Componentes Standalone)
*   **Gestor de Estados**: Programación reactiva con RxJS (`BehaviorSubject`, pipeline reactivo)
*   **Estilos**: CSS modular y personalizado sobre framework premium Phoenix
*   **Seguridad**: Autenticación JWT y políticas de RBAC a nivel de UI
*   **Interacciones**: SweetAlert2 (`SwalService`) para diálogos enriquecidos

---

## 📂 Estructura de Directorios Clave
```text
frontend/src/app/
├── core/                  # Guardias, interceptores, servicios globales y modelos
│   ├── services/
│   │   ├── auth.service.ts        # Control de tokens JWT y sesión
│   │   ├── despacho.service.ts    # Consumo de API de despachos e inventario
│   │   ├── usuarios.service.ts    # Control de cuentas y roles
│   │   └── swal.service.ts        # Alertas personalizadas
│   └── models/
│       └── farmacia.models.ts     # Interfaces de dominio (Lotes, Medicamento, etc.)
├── features/              # Módulos de funcionalidad independientes
│   ├── auth/              # Pantallas de acceso (Login, Forgot Password, Change Password)
│   ├── despacho/          # Flujo de despacho controlado por FEFO
│   ├── usuarios/          # Gestión de cuentas de usuario y asignación de roles
│   └── operaciones/       # Trámites y hojas de ruta (Tipo 1, 2 y 3)
└── shared/                # Directivas, pipes y componentes reutilizables
    ├── directives/
    │   ├── solo-numeros.directive.ts   # Restringe caracteres no numéricos
    │   └── uppercase.directive.ts      # Transforma texto a mayúsculas
    └── pipes/
        └── formatos/
            └── cedula-format.pipe.ts   # Formatea números de cédula con puntos
```

---

## 🔐 Módulo de Autenticación y Login
El login y la seguridad del portal se gestionan a través de `LoginComponent` y `AuthService`.

### 1. Renombramiento Institucional
El portal se ha personalizado como **Sistema de Inventario de Farmacia (SIFARMA)**.
*   El título del banner lateral se divide en dos líneas (`Sistema de Inventario de Salud y<br />Abastecimiento al Personal`) para preservar un balance visual en pantallas ultra-anchas.
*   Los logos dinámicos se renderizan adaptativamente en la tarjeta según el tema actual:
    *   **Modo Claro**: `assets/img/SIFARMA__light_.png` (Letras oscuras)
    *   **Modo Oscuro**: `assets/img/SIFARMA__dark_.png` (Letras claras)

### 2. Recordar Credenciales
*   **Desactivado por defecto**: La casilla de verificación `remember` inicia en `false` por políticas de seguridad.
*   **Carga en ngOnInit**: Si la casilla fue marcada previamente, la última cédula guardada en `localStorage` se recupera y pre-llena en el formulario.
*   **Integración con el Navegador (`navigator.credentials`)**:
    *   **Al Activar**: Si se inicia sesión con éxito y la casilla está marcada, se utiliza la API nativa de credenciales del navegador (`navigator.credentials.store()`) para que el explorador guarde la combinación usuario/clave.
    *   **Al Desactivar**: Si la casilla está vacía, se elimina la cédula de `localStorage` y se vacía síncronamente el valor del campo `password` en el DOM en el momento exacto del submit. Esto impide que Google Chrome u otros navegadores intercepten la contraseña y muestren forzadamente la ventana nativa de *"¿Desea guardar la contraseña?"*. En caso de fallar el login, los datos son restaurados en el campo para la comodidad del usuario sin que tenga que volver a escribir.

---

## 🛡️ Restricciones y Validaciones en Campos de Cédula
Por políticas institucionales del Estado venezolano (cédulas expresadas en millones, tope técnico en `99.999.999`), todos los campos que capturen cédulas deben estar restringidos estrictamente:

| Componente | Archivos Modificados | Restricciones Aplicadas |
| :--- | :--- | :--- |
| **Login** | `login.component.ts` | `appSoloNumeros`, `maxlength="8"` |
| **Olvidé mi Clave** | `forgot-password.component.ts` | `appSoloNumeros`, `maxlength="8"`, importado en Standalone |
| **Buscador Despachos** | `despacho.component.ts` | `appSoloNumeros`, `maxlength="10"`. (El límite es 10 porque el campo visual formatea con puntos, ej. `99.999.999`, lo que añade 2 caracteres adicionales a los 8 dígitos reales). |
| **Gestión de Usuarios** | `usuarios.component.ts` | `appSoloNumeros`, `maxlength="8"` (Modal de creación) |
| **Verificar Usuario** | `verificar-usuario.html/.ts` | `appSoloNumeros`, `maxlength="8"` (Buscador superior) |
| **Hoja de Ruta (Acceso Rápido)** | `hoja-ruta.html/.ts` | `appSoloNumeros`, `maxlength="8"` (Inputs de Cédula Titular y Beneficiario en los modales de Solicitud Tipo 1, 2 y 3) |

---

## 🎨 Lógica de Temas (Modo Oscuro / Claro)
El estado del tema se administra por medio de la clase global `.dark` en el `<html>` y la variable `isDarkMode` vinculada al `localStorage['phoenixTheme']`.
*   Para layouts de login y recuperación de contraseña, se utiliza un fondo invertido forzado (`bg-inverted-light` y `bg-inverted-dark`) que garantiza que los banners e imágenes jueguen adecuadamente con el contraste y mantengan la legibilidad óptima.
