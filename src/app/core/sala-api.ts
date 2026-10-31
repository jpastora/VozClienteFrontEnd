import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { SalaDTO } from './models';

@Injectable({ providedIn: 'root' })
export class SalaApi {
  private http = inject(HttpClient);

  /** GET /api/salas/{token} */
  obtener(token: string): Observable<SalaDTO> {
    return this.http.get<SalaDTO>(`${API_URL}/salas/${encodeURIComponent(token)}`);
  }

  /** PATCH /api/salas/{token}/responder?nombreConsumidor=... (registra la aceptación de la grabación) */
  responder(token: string, nombreConsumidor: string): Observable<SalaDTO> {
    const params = new HttpParams().set('nombreConsumidor', nombreConsumidor);
    return this.http.patch<SalaDTO>(`${API_URL}/salas/${encodeURIComponent(token)}/responder`, null, { params });
  }
}
