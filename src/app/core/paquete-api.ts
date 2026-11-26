import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { PaqueteDTO, PaqueteRequest } from './models';
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

  // ---- Gestión de paquetes: solo el administrador de la plataforma (RF-17) ----

  /** GET /api/paquetes: todos los paquetes, activos e inactivos. */
  listarTodos(): Observable<PaqueteDTO[]> {
    return this.http.get<PaqueteDTO[]>(`${API_URL}/paquetes`);
  }

  /** POST /api/paquetes: crea un paquete (queda activo si no se indica lo contrario). */
  crear(datos: PaqueteRequest): Observable<PaqueteDTO> {
    return this.http.post<PaqueteDTO>(`${API_URL}/paquetes`, datos);
  }

  /** PUT /api/paquetes/{id}: edita nombre, salas y precio. Las compras ya hechas no cambian. */
  actualizar(id: number, datos: PaqueteRequest): Observable<PaqueteDTO> {
    return this.http.put<PaqueteDTO>(`${API_URL}/paquetes/${id}`, datos);
  }

  /** PATCH /api/paquetes/{id}/activar: vuelve a ofrecer el paquete. */
  activar(id: number): Observable<void> {
    return this.http.patch<void>(`${API_URL}/paquetes/${id}/activar`, null);
  }

  /** PATCH /api/paquetes/{id}/desactivar: deja de ofrecerlo; quienes lo compraron conservan su saldo. */
  desactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${API_URL}/paquetes/${id}/desactivar`, null);
  }

  /** PATCH /api/paquetes/{id}/recomendar: lo marca como recomendado y se lo quita al anterior. */
  recomendar(id: number): Observable<PaqueteDTO> {
    return this.http.patch<PaqueteDTO>(`${API_URL}/paquetes/${id}/recomendar`, null);
  }

  /** PATCH /api/paquetes/{id}/quitar-recomendado: el catálogo queda sin paquete destacado. */
  quitarRecomendado(id: number): Observable<PaqueteDTO> {
    return this.http.patch<PaqueteDTO>(`${API_URL}/paquetes/${id}/quitar-recomendado`, null);
  }

  /** DELETE /api/paquetes/{id}: solo si nunca se vendió (si no, el back-end responde 409). */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/paquetes/${id}`);
  }
}
