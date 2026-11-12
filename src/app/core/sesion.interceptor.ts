import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session';
import { URL_SESION } from './auth-api';
import { RUTAS } from './rutas';

/**
 * Marca una petición como pública (p. ej. el catálogo de paquetes del home). Si responde 401,
 * el interceptor no limpia la sesión ni lleva a la pantalla de ingreso.
 */
export const PETICION_PUBLICA = new HttpContextToken<boolean>(() => false);

const RUTAS_SIN_SESION = ['/sala/', '/publico/'];
const enPantallaSinSesion = (): boolean =>
  RUTAS_SIN_SESION.some((prefijo) => location.pathname.startsWith(prefijo));

/**
 * Cuando la API responde 401 (la sesión expiró por inactividad o se cerró), limpia la sesión y
 * lleva a la pantalla de ingreso con un mensaje (HU-01). No actúa sobre la consulta inicial de la
 * sesión, que responde 401 de forma normal cuando nadie ha ingresado, ni sobre peticiones públicas.
 */
export const sesionInterceptor: HttpInterceptorFn = (request, next) => {
  const sesion = inject(SessionService);
  const router = inject(Router);
  

  return next(request).pipe(
    catchError((error: unknown) => {
      const esPublica = request.context.get(PETICION_PUBLICA);
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !esPublica &&
        !enPantallaSinSesion() && 
        !request.url.endsWith(URL_SESION)
      ) {
        const habiaSesion = sesion.autenticado();
        sesion.establecer(null);
        void router.navigate([RUTAS.ingreso], { queryParams: habiaSesion ? { error: 'sesion_expirada' } : {} });
      }
      return throwError(() => error);
    }),
  );
};