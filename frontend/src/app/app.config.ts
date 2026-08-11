import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { routes } from './app.routes';
import { TimeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { authInterceptor } from './core/interceptors/auth-interceptor'; // <-- Tu interceptor nuevo
import localeEs from '@angular/common/locales/es';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeEs, 'es');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Registramos SOLO la función authInterceptor aquí
    provideHttpClient(withInterceptors([authInterceptor]), withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TimeoutInterceptor,
      multi: true,
    },
    { provide: LOCALE_ID, useValue: 'es' },
  ],
};
