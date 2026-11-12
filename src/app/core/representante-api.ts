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

  /** POST /api/representantes: la cuenta queda PENDIENTE hasta su primer ingreso, con Google o con la contraseña inicial (RF-03). */
  crear(representante: CrearRepresentanteRequest): Observable<CuentaDTO> {
    return this.http.post<CuentaDTO>(`${API_URL}/representantes`, representante);
  }

  /** PATCH /api/representantes/{id}/contrasena: asigna o cambia la contraseña para ingresar sin Google. */
  asignarContrasena(id: number, contrasena: string): Observable<CuentaDTO> {
    return this.http.patch<CuentaDTO>(`${API_URL}/representantes/${id}/contrasena`, { contrasena });
  }

  /** PATCH /api/representantes/{id}/desactivar: devuelve la cuenta con estado INACTIVA. */
  desactivar(id: number): Observable<CuentaDTO> {
    return this.http.patch<CuentaDTO>(`${API_URL}/representantes/${id}/desactivar`, null);
  }
}
