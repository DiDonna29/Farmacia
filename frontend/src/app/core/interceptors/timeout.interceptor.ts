import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError, timeout, catchError } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Timeout de 15 segundos
    return next.handle(req).pipe(
      timeout(15000),
      catchError(err => {
        if (err.name === 'TimeoutError') {
          // Lanzamos un error que el componente pueda interpretar
          return throwError(() => ({
            status: 408,
            message: 'La solicitud ha tardado demasiado tiempo.',
            detail: 'El servidor tardó demasiado en responder. Por favor, intente de nuevo.'
          }));
        }
        return throwError(() => err);
      })
    );
  }
}
