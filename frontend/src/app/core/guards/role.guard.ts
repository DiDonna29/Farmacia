import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = route.data['roles'] || [];

  if (authService.hasRole(...allowedRoles)) {
    return true;
  }

  // Si autenticado pero sin rol apropiado → redirigir según el rol
  const user = authService.getCurrentUser();
  const rol = user?.rol?.toUpperCase();

  if (rol === 'AUDITOR') {
    return router.parseUrl('/estadisticas');
  }

  if (rol === 'PROVEEDURIA') {
    return router.parseUrl('/proveeduria/solicitudes');
  }

  // Si no es AUDITOR/PROVEEDURIA y no tiene permiso para la ruta actual,
  // redirigimos a perfil para romper el bucle.
  return router.parseUrl('/perfil');
};

