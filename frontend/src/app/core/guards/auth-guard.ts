import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser();
    const hasEmail = user?.email && user.email.trim().length > 0;
    const isTourDismissed = sessionStorage.getItem('sifarmaOnboardingTourDismissed') === 'true';

    // Rutas exentas del chequeo de email (acceso de operaciones básicas)
    const exemptPaths = ['/perfil', '/auditoria', '/proveeduria'];
    const isExempt = exemptPaths.some(p => state.url.startsWith(p));

    if (!hasEmail && !isTourDismissed && !isExempt) {
      router.navigate(['/perfil']);
      return false;
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};

