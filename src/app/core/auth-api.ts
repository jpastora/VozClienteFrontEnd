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

/** Ingreso con correo y contraseña propios de la aplicación. */
export const URL_INGRESO = `${API_URL}/auth/ingresar`;

/** Registro con correo y contraseña: crea la empresa y la cuenta de cliente-administrador. */
export const URL_REGISTRO = `${API_URL}/auth/registro`;

/**
 * Rutas de autenticación cuyo 401 es una respuesta normal (no hay sesión o las credenciales no
 * coinciden) y no una sesión vencida; el interceptor no las trata como sesión expirada.
 */
export const RUTAS_AUTH_SIN_SESION = [URL_SESION, URL_INGRESO, URL_REGISTRO];

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
   * POST /api/auth/ingresar: ingreso con correo y contraseña. El back-end deja la cookie de sesión.
   *
   * @param correo correo de la cuenta
   * @param contrasena contraseña
   * @returns flujo con los datos de la sesión; 401 si no coinciden, 403 si la cuenta está inactiva
   */
  ingresar(correo: string, contrasena: string): Observable<UsuarioInfo> {
    return this.http.post<UsuarioInfo>(URL_INGRESO, { correo, contrasena });
  }

  /**
   * POST /api/auth/registro: crea la empresa y la cuenta de cliente-administrador y abre la sesión.
   *
   * @param nombreCompleto nombre de la persona
   * @param correo correo de la cuenta
   * @param contrasena contraseña
   * @returns flujo con los datos de la sesión; 409 si el correo ya existe, 400 si la contraseña no cumple
   */
  registrar(nombreCompleto: string, correo: string, contrasena: string): Observable<UsuarioInfo> {
    return this.http.post<UsuarioInfo>(URL_REGISTRO, { nombreCompleto, correo, contrasena });
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
