import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import {
  CambiarEstadoRequest,
  CambiarRolRequest,
  CambioRolDTO,
  CrearCuentaRequest,
  CuentaGlobalDTO,
} from './models';

/** Módulo de usuarios (/api/cuentas). Solo el administrador de la plataforma tiene permiso. */
@Injectable({
  providedIn: 'root',
})
export class CuentaApi {
  private readonly http = inject(HttpClient);

  /** Cuentas de todas las empresas, o solo las de una si se indica `empresaId`. */
  listar(empresaId?: number | null): Observable<CuentaGlobalDTO[]> {
    let params = new HttpParams();
    if (empresaId != null) {
      params = params.set('empresaId', empresaId);
    }
    return this.http.get<CuentaGlobalDTO[]>(`${API_URL}/cuentas`, { params });
  }

  /** Crea una cuenta pendiente con cualquier rol; el back-end envía la contraseña temporal por correo. */
  crear(solicitud: CrearCuentaRequest): Observable<CuentaGlobalDTO> {
    return this.http.post<CuentaGlobalDTO>(`${API_URL}/cuentas`, solicitud);
  }

  /** Cambia el rol de una cuenta; responde 409 si la versión ya no es la vigente. */
  cambiarRol(id: number, solicitud: CambiarRolRequest): Observable<CuentaGlobalDTO> {
    return this.http.patch<CuentaGlobalDTO>(`${API_URL}/cuentas/${id}/rol`, solicitud);
  }

  /** Activa o desactiva una cuenta (no queda en la bitácora de roles). */
  cambiarEstado(id: number, solicitud: CambiarEstadoRequest): Observable<CuentaGlobalDTO> {
    return this.http.patch<CuentaGlobalDTO>(`${API_URL}/cuentas/${id}/estado`, solicitud);
  }

  /** Genera una contraseña temporal nueva y la envía por correo. */
  reenviarContrasena(id: number): Observable<CuentaGlobalDTO> {
    return this.http.post<CuentaGlobalDTO>(`${API_URL}/cuentas/${id}/contrasena-temporal`, null);
  }

  /** Bitácora de cambios de rol de una cuenta, del más reciente al más antiguo. */
  historial(id: number): Observable<CambioRolDTO[]> {
    return this.http.get<CambioRolDTO[]>(`${API_URL}/cuentas/${id}/cambios-rol`);
  }
}
