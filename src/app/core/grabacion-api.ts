import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { GrabacionDTO, ResultadoGrabacion } from './models';

@Injectable({ providedIn: 'root' })
export class GrabacionApi {
  private http = inject(HttpClient);

  /**
   * POST /api/v1/grabaciones (multipart/form-data).
   * No se fija Content-Type a mano: el navegador añade el boundary correcto.
   */
  subir(entrevistaId: number, r: ResultadoGrabacion, esParcial: boolean): Observable<HttpEvent<GrabacionDTO>> {
    const form = new FormData();
    form.append('entrevistaId', String(entrevistaId));
    form.append('archivo', r.blob, `entrevista_${entrevistaId}.webm`);
    form.append('duracionSegundos', String(r.duracionSegundos));
    form.append('tieneAudioCliente', String(r.tieneAudioCliente));
    form.append('esParcial', String(esParcial));

    return this.http.post<GrabacionDTO>(`${API_URL}/v1/grabaciones`, form, {
      observe: 'events',
      reportProgress: true,
    });
  }
}
