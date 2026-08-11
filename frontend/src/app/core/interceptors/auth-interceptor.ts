import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

// Mantenemos el estado del refresh fuera de la función
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejo del 401: ignorar rutas de auth para evitar bucles
      if (error.status === 401 && !req.url.includes('/auth/login/') && !req.url.includes('/auth/refresh/')) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((res) => {
              isRefreshing = false;
              refreshTokenSubject.next(res.access);
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${res.access}` },
              });
              return next(newReq);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              refreshTokenSubject.next(null);
              // Sesión completamente expirada → limpiar y redirigir
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('current_user');
              router.navigate(['/login']);
              return throwError(() => refreshErr);
            }),
          );
        }

        // Si ya se está refrescando, esperamos a que termine
        return refreshTokenSubject.pipe(
          filter((t) => t !== null),
          take(1),
          switchMap((t) => next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }))),
        );
      }

      // Si el refresh mismo falla con 401, redirigir directamente
      if (error.status === 401 && req.url.includes('/auth/refresh/')) {
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('current_user');
        router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
