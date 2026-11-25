import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';

import {
  EstadisticasDTO,
  FiltrosEstadisticas,
} from './models';

@Injectable({
  providedIn: 'root',
})
export class EstadisticasApi {

  private readonly http = inject(HttpClient);

  private readonly url = `${API_URL}/estadisticas`;

  obtener(
    filtros: FiltrosEstadisticas = {}
  ): Observable<EstadisticasDTO> {

    let params = new HttpParams();

    if (filtros.productoId != null) {
      params = params.set(
        'productoId',
        filtros.productoId.toString()
      );
    }

    if (filtros.desde) {
      params = params.set(
        'desde',
        filtros.desde
      );
    }

    if (filtros.hasta) {
      params = params.set(
        'hasta',
        filtros.hasta
      );
    }

    return this.http.get<EstadisticasDTO>(
      this.url,
      { params }
    );
  }
}