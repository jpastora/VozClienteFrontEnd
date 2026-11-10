import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';

import {
  EntrevistaDTO,
  EntrevistaListadoDTO,
  EntrevistaDetalleDTO,
  Pagina,
  EstadoEntrevista
} from './models';

@Injectable({
  providedIn: 'root'
})
export class EntrevistaApi {

  private readonly http = inject(HttpClient);

  // ==========================================
  // VIDEOLLAMADAS
  // ==========================================

  iniciar(
    salaId: number,
    representanteId: number
  ): Observable<EntrevistaDTO> {

    return this.http.post<EntrevistaDTO>(
      `${API_URL}/entrevistas`,
      {
        salaId,
        representanteId
      }
    );
  }

  finalizar(id: number): Observable<EntrevistaDTO> {

    return this.http.patch<EntrevistaDTO>(
      `${API_URL}/entrevistas/${id}/finalizar`,
      null
    );
  }

  reportarFallo(id: number): Observable<EntrevistaDTO> {

    return this.http.patch<EntrevistaDTO>(
      `${API_URL}/entrevistas/${id}/fallo`,
      null
    );
  }

  // ==========================================
  // PANEL DE ENTREVISTAS
  // ==========================================

  listarDetalladas(
    pagina: number = 0,
    productoId?: number,
    estado?: EstadoEntrevista
  ): Observable<Pagina<EntrevistaListadoDTO>> {

    const params: Record<string, string> = {
      page: String(pagina)
    };

    if (productoId !== undefined) {
      params['productoId'] = String(productoId);
    }

    if (estado !== undefined) {
      params['estado'] = estado;
    }

    return this.http.get<Pagina<EntrevistaListadoDTO>>(
      `${API_URL}/entrevistas/listado`,
      { params }
    );
  }

  // Alias para conservar compatibilidad
  listar(
    pagina: number = 0,
    productoId?: number,
    estado?: EstadoEntrevista
  ): Observable<Pagina<EntrevistaListadoDTO>> {

    return this.listarDetalladas(
      pagina,
      productoId,
      estado
    );
  }

  obtenerDetalle(
    entrevistaId: number
  ): Observable<EntrevistaDetalleDTO> {

    return this.http.get<EntrevistaDetalleDTO>(
      `${API_URL}/entrevistas/${entrevistaId}/detalle`
    );
  }

}
