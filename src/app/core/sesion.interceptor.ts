import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session';
import { URL_SESION } from './auth-api';

/**
 * Cuando la API responde 401 (la sesión expiró por inactividad o se cerró), limpia la sesión y
 * lleva a la pantalla de ingreso con un mensaje (HU-01). No actúa sobre la consulta inicial de la
 * sesión, que responde 401 de forma normal cuando nadie ha ingresado.
 */
export const sesionInterceptor: HttpInterceptorFn = (request, next) => {
  const sesion = inject(SessionService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.endsWith(URL_SESION)) {
        const habiaSesion = sesion.autenticado();
        sesion.establecer(null);
        void router.navigate(['/auth'], { queryParams: habiaSesion ? { error: 'sesion_expirada' } : {} });
      }
      return throwError(() => error);
    }),
  );
};
