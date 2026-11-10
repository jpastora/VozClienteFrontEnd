import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { EntrevistaDTO } from './models';

@Injectable({ providedIn: 'root' })
export class EntrevistaApi {
  private http = inject(HttpClient);

  /** POST /api/entrevistas: el backend la deja EN_CURSO con inicio = ahora. */
  iniciar(salaId: number, representanteId: number): Observable<EntrevistaDTO> {
    return this.http.post<EntrevistaDTO>(`${API_URL}/entrevistas`, { salaId, representanteId });
  }

  /** PATCH /api/entrevistas/{id}/finalizar: estado FINALIZADA, finEn y duracionSegundos. */
  finalizar(id: number): Observable<EntrevistaDTO> {
    return this.http.patch<EntrevistaDTO>(`${API_URL}/entrevistas/${id}/finalizar`, null);
  }

  /** PATCH /api/entrevistas/{id}/fallo: estado FALLIDA (desconexión o error), con finEn y duración. */
  reportarFallo(id: number): Observable<EntrevistaDTO> {
    return this.http.patch<EntrevistaDTO>(`${API_URL}/entrevistas/${id}/fallo`, null);
  }
}
