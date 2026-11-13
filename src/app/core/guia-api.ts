import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { GuiaDTO } from './models';

@Injectable({ providedIn: 'root' })
export class GuiaApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/guias`;

  /** GET /api/guias/empresa/{empresaId} */
  listarPorEmpresa(empresaId: number): Observable<GuiaDTO[]> {
    return this.http.get<GuiaDTO[]>(`${this.url}/empresa/${empresaId}`);
  }

  /** GET /api/guias/{id} */
  obtener(id: number): Observable<GuiaDTO> {
    return this.http.get<GuiaDTO>(`${this.url}/${id}`);
  }

  /** POST /api/guias */
  crear(guia: GuiaDTO): Observable<GuiaDTO> {
    return this.http.post<GuiaDTO>(this.url, guia);
  }

  /** PUT /api/guias/{id}: solo cambia el título y las preguntas. */
  actualizar(id: number, guia: GuiaDTO): Observable<GuiaDTO> {
    return this.http.put<GuiaDTO>(`${this.url}/${id}`, guia);
  }

  /** DELETE /api/guias/{id} */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}