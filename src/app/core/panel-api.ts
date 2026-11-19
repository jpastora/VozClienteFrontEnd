import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { PanelGlobalDTO } from './models';

/** Panel global de ingresos y estadísticas (/api/panel-global, RF-19). */
@Injectable({ providedIn: 'root' })
export class PanelApi {
  private readonly http = inject(HttpClient);

  /** GET /api/panel-global: indicadores de todas las empresas. */
  obtener(): Observable<PanelGlobalDTO> {
    return this.http.get<PanelGlobalDTO>(`${API_URL}/panel-global`);
  }
}
