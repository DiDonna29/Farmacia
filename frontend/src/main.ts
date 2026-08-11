import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import localeEs from '@angular/common/locales/es';
import { registerLocaleData } from '@angular/common';
import { App } from './app/app';

// 2. Registra el idioma antes de arrancar la app
registerLocaleData(localeEs, 'es');

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
