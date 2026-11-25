import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { CrearRepresentanteRequest, CuentaDTO } from './models';

@Injectable({ providedIn: 'root' })
export class RepresentanteApi {
  private http = inject(HttpClient);

  /** GET /api/representantes: representantes de la empresa del usuario autenticado. */
  listar(): Observable<CuentaDTO[]> {
    return this.http.get<CuentaDTO[]>(`${API_URL}/representantes`);
  }

  /** POST /api/representantes: la cuenta queda PENDIENTE hasta su primer ingreso con Google (RF-03). */
  crear(representante: CrearRepresentanteRequest): Observable<CuentaDTO> {
    return this.http.post<CuentaDTO>(`${API_URL}/representantes`, representante);
  }

  /** POST /api/representantes/{id}/contrasena-temporal: envía una contraseña temporal nueva por correo. */
  reenviarContrasena(id: number): Observable<CuentaDTO> {
    return this.http.post<CuentaDTO>(`${API_URL}/representantes/${id}/contrasena-temporal`, null);
  }

  /** PATCH /api/representantes/{id}/activar: reactiva un representante desactivado. */
  activar(id: number): Observable<CuentaDTO> {
    return this.http.patch<CuentaDTO>(`${API_URL}/representantes/${id}/activar`, null);
  }

  /** PATCH /api/representantes/{id}/desactivar: devuelve la cuenta con estado INACTIVA. */
  desactivar(id: number): Observable<CuentaDTO> {
    return this.http.patch<CuentaDTO>(`${API_URL}/representantes/${id}/desactivar`, null);
  }

  /** DELETE /api/representantes/{id}: solo si no tiene datos relacionados (si no, responde 409). */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/representantes/${id}`);
  }
}
