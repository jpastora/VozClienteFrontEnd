import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { CompraDTO, CompraRequest } from './models';

@Injectable({ providedIn: 'root' })
export class CompraApi {
  private http = inject(HttpClient);

  /** POST /api/compras (RF-18): compra con pago simulado; el back-end decide monto, salas y estado. */
  crear(compra: CompraRequest): Observable<CompraDTO> {
    return this.http.post<CompraDTO>(`${API_URL}/compras`, compra);
  }

  /** GET /api/compras/paquete/{paqueteId}: compras de un paquete (el administrador ve todas). */
  listarPorPaquete(paqueteId: number): Observable<CompraDTO[]> {
    return this.http.get<CompraDTO[]>(`${API_URL}/compras/paquete/${paqueteId}`);
  }

  /**
   * DELETE /api/compras/{id}: anula una compra (solo el administrador de la plataforma). El back-end
   * responde 409 si la empresa ya usó o reservó las salas de esa compra.
   */
  anular(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/compras/${id}`);
  }

  /** GET /api/compras/empresa/{empresaId}: historial de compras de la empresa. */
  listarPorEmpresa(empresaId: number): Observable<CompraDTO[]> {
    return this.http.get<CompraDTO[]>(`${API_URL}/compras/empresa/${empresaId}`);
  }
}
