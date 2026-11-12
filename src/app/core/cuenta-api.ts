import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import { CambiarRolRequest, CambioRolDTO, CrearCuentaRequest, CuentaDTO } from './models';

/** Administración de cuentas (/api/cuentas). Solo el administrador de la plataforma tiene permiso. */
@Injectable({
  providedIn: 'root',
})
export class CuentaApi {
  private readonly http = inject(HttpClient);

  /** Cuentas dentro del ámbito de quien tiene la sesión (hoy, las de su propia empresa). */
  listar(): Observable<CuentaDTO[]> {
    return this.http.get<CuentaDTO[]>(`${API_URL}/cuentas`);
  }

  /** Crea una cuenta de cliente-administrador en estado pendiente. */
  crear(solicitud: CrearCuentaRequest): Observable<CuentaDTO> {
    return this.http.post<CuentaDTO>(`${API_URL}/cuentas`, solicitud);
  }

  /** Cambia el rol de una cuenta; responde 409 si la versión ya no es la vigente. */
  cambiarRol(id: number, solicitud: CambiarRolRequest): Observable<CuentaDTO> {
    return this.http.patch<CuentaDTO>(`${API_URL}/cuentas/${id}/rol`, solicitud);
  }

  /** Bitácora de cambios de rol de una cuenta, del más reciente al más antiguo. */
  historial(id: number): Observable<CambioRolDTO[]> {
    return this.http.get<CambioRolDTO[]>(`${API_URL}/cuentas/${id}/cambios-rol`);
  }
}
