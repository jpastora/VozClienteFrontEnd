import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { sesionInterceptor } from './core/sesion.interceptor';
import { SessionService } from './services/session';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Se usa XHR (sin withFetch) a propósito: fetch no reporta progreso de subida.
    provideHttpClient(withInterceptors([sesionInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    // Antes de mostrar cualquier pantalla se consulta si hay sesión (cookie HttpOnly), para que
    // las guardas por rol sepan quién ingresó (HU-01).
    provideAppInitializer(() => inject(SessionService).cargar()),
  ],
};
