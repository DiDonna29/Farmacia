import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Login
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'auth/change-password',
    loadComponent: () => import('./features/auth/pages/change-password/change-password.component').then(m => m.ChangePasswordComponent),
  },

  // Layout principal (protegido)
  {
    path: '',
    loadComponent: () => import('./shared/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      // Ruta raíz: redirige a /inicio (el roleGuard se encarga de mover al AUDITOR a /estadisticas)
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },

      // Perfil — Todos los roles (siempre accesible)
      {
        path: 'perfil',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },

      // Dashboard — ADMINISTRADOR, ENCARGADO, FARMACEUTICO
      {
        path: 'inicio',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'DIRECTOR_SERVICIO_MEDICO'] },
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },

      // Inventario — ADMINISTRADOR, ENCARGADO, FARMACEUTICO
      {
        path: 'inventario',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'DIRECTOR_SERVICIO_MEDICO'] },
        loadComponent: () => import('./features/inventario/inventario.component').then(m => m.InventarioComponent),
      },

      // Medicamentos (catálogo base) — ADMINISTRADOR, ENCARGADO, FARMACEUTICO, PROVEEDURIA
      {
        path: 'medicamentos',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO'] },
        loadComponent: () => import('./features/medicamentos/medicamentos.component').then(m => m.MedicamentosComponent),
      },

      // Dotación (ingreso de lotes) — ADMINISTRADOR, ENCARGADO, FARMACEUTICO, PROVEEDURIA
      {
        path: 'dotacion',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO'] },
        loadComponent: () => import('./features/dotacion/dotacion.component').then(m => m.DotacionComponent),
      },

      // Despacho — ADMINISTRADOR, ENCARGADO, FARMACEUTICO
      {
        path: 'despacho',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'DIRECTOR_SERVICIO_MEDICO'] },
        loadComponent: () => import('./features/despacho/despacho.component').then(m => m.DespachoComponent),
      },

      // Historial de despachos — ADMINISTRADOR, ENCARGADO, FARMACEUTICO
      {
        path: 'historial',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'DIRECTOR_SERVICIO_MEDICO'] },
        loadComponent: () => import('./features/historial/historial.component').then(m => m.HistorialComponent),
      },

      // Gestión de Usuarios — Solo ENCARGADO y ADMINISTRADOR
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        data: { roles: ['ENCARGADO', 'ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO'] },
        children: [
          { path: '', redirectTo: 'activos', pathMatch: 'full' },
          {
            path: 'activos',
            loadComponent: () => import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent)
          },
          {
            path: 'inactivos',
            loadComponent: () => import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent)
          }
        ]
      },

      // Estadísticas — ENCARGADO, ADMINISTRADOR y AUDITOR
      {
        path: 'estadisticas',
        loadComponent: () => import('./features/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent),
        canActivate: [roleGuard],
        data: { roles: ['ENCARGADO', 'ADMINISTRADOR', 'AUDITOR', 'DIRECTOR_SERVICIO_MEDICO'] },
      },

      // Auditoría (Papelera + Bitácora)
      {
        path: 'auditoria',
        canActivate: [roleGuard],
        data: { roles: ['ENCARGADO', 'ADMINISTRADOR', 'AUDITOR', 'DIRECTOR_SERVICIO_MEDICO', 'PROVEEDURIA'] },
        children: [
          { path: '', redirectTo: 'bajas', pathMatch: 'full' },
          {
            path: 'bajas',
            loadComponent: () => import('./features/auditoria/auditoria-bajas.component').then(m => m.AuditoriaBajasComponent)
          },
          {
            path: 'logs',
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'AUDITOR', 'DIRECTOR_SERVICIO_MEDICO'] },
            loadComponent: () => import('./features/auditoria/auditoria-logs.component').then(m => m.AuditoriaLogsComponent)
          }
        ]
      },

      // Proveduría
      {
        path: 'proveeduria',
        children: [
          {
            path: 'solicitudes',
            loadComponent: () => import('./features/proveeduria/solicitudes/solicitudes.component').then(m => m.SolicitudesComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'ENCARGADO', 'FARMACEUTICO', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO'] }
          },
          {
            path: 'inventario',
            loadComponent: () => import('./features/proveeduria/inventario/inventario.component').then(m => m.InventarioComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'ENCARGADO', 'PROVEEDURIA', 'DIRECTOR_SERVICIO_MEDICO'] }
          }
        ]
      }
    ],
  },

  // Fallback
  { path: '**', redirectTo: 'login' },
];