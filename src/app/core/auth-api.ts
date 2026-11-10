import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UsuarioInfo } from '../interfaces/usuario';
import { API_URL } from './config';

/**
 * Ruta que inicia el ingreso con Google (HU-01). La atiende Spring Security: redirige a Google y,
 * al volver, deja la sesión en la cookie HttpOnly VC_SESION. En desarrollo pasa por proxy.conf.json.
 */
export const URL_INGRESO_GOOGLE = '/oauth2/authorization/google';

/** Ruta de la API que devuelve la persona con sesión. */
export const URL_SESION = `${API_URL}/auth/yo`;

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  /**
   * GET /api/auth/yo: persona con sesión iniciada.
   *
   * @returns flujo con los datos de la sesión; falla con 401 si no hay sesión
   */
  obtenerSesion(): Observable<UsuarioInfo> {
    return this.http.get<UsuarioInfo>(URL_SESION);
  }

  /**
   * POST /api/auth/salir: borra la cookie de sesión.
   *
   * @returns flujo que se completa cuando el back-end cerró la sesión
   */
  salir(): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/salir`, null);
  }
}
