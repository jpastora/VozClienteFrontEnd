import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session';
import { API_URL } from './config';

/** Cabecera con la empresa que atiende el administrador de la plataforma (la lee UsuarioActualService). */
export const CABECERA_EMPRESA = 'X-Empresa-Id';

/**
 * Modo soporte: cuando el administrador de la plataforma eligió una empresa, cada llamada a la API
 * lleva su identificador para que los módulos (productos, representantes, entrevistas…) trabajen
 * sobre esa empresa. Con los demás perfiles no agrega nada: el back-end usa la empresa de la cuenta.
 */
export const empresaInterceptor: HttpInterceptorFn = (request, next) => {
  const sesion = inject(SessionService);
  const empresaId = sesion.empresaId();

  if (sesion.usuario()?.rol === 'ADMINISTRADOR' && empresaId !== null && request.url.startsWith(`${API_URL}/`)) {
    return next(request.clone({ setHeaders: { [CABECERA_EMPRESA]: String(empresaId) } }));
  }
  return next(request);
};
