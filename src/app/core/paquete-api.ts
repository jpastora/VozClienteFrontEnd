import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { PaqueteDTO } from './models';
import { PETICION_PUBLICA } from './sesion.interceptor';

@Injectable({ providedIn: 'root' })
export class PaqueteApi {
  private http = inject(HttpClient);

  /** GET /api/paquetes/activos: catálogo de paquetes que se pueden comprar. */
  listarActivos(): Observable<PaqueteDTO[]> {
    return this.http.get<PaqueteDTO[]>(`${API_URL}/paquetes/activos`);
  }

  /**
   * GET /api/paquetes/activos para el home público. Se marca como petición pública para que un
   * 401 (visitante sin sesión) no lleve a la pantalla de ingreso.
   *
   * @returns flujo con la lista de paquetes activos
   */
  listarActivosPublico(): Observable<PaqueteDTO[]> {
    return this.http.get<PaqueteDTO[]>(`${API_URL}/paquetes/activos`, {
      context: new HttpContext().set(PETICION_PUBLICA, true),
    });
  }
}