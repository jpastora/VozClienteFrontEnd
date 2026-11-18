import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { CanalGrabacion, FragmentoAck, GrabacionDTO, ResultadoGrabacion } from './models';

/**
 * Cliente de la API de grabaciones.
 *
 * Grabación por fragmentos (HU-10): iniciar → enviarFragmento (cada ~5 s, por canal) → finalizar.
 * NOTA: las rutas de los tres métodos siguientes son las que asume el front; si el controlador del
 * back-end usa otras, basta con cambiar la función `ruta` de abajo.
 */
const BASE = `${API_URL}/v1/grabaciones`;
const ruta = (entrevistaId: number, accion: 'iniciar' | 'fragmentos' | 'finalizar'): string =>
  `${BASE}/${entrevistaId}/${accion}`;

@Injectable({ providedIn: 'root' })
export class GrabacionApi {
  private http = inject(HttpClient);

  /** Crea la grabación en estado GRABANDO. Es idempotente en el back-end. */
  iniciar(entrevistaId: number): Observable<GrabacionDTO> {
    return this.http.post<GrabacionDTO>(ruta(entrevistaId, 'iniciar'), {});
  }

  /**
   * Envía un fragmento de un canal (multipart). Respuestas relevantes:
   * 200 → FragmentoAck; 409 con `secuenciaEsperada` → reanudar desde ahí;
   * 409 sin ella → la grabación ya se cerró; 400 → fragmento inválido o dañado.
   */
  enviarFragmento(
    entrevistaId: number,
    canal: CanalGrabacion,
    secuencia: number,
    blob: Blob,
    hash?: string,
  ): Observable<FragmentoAck> {
    const form = new FormData();
    form.append('canal', canal);
    form.append('secuencia', String(secuencia));
    form.append('fragmento', blob, `${canal.toLowerCase()}_${secuencia}.webm`);
    if (hash) form.append('hashSha256', hash);
    return this.http.post<FragmentoAck>(ruta(entrevistaId, 'fragmentos'), form);
  }

  /** Cierra la grabación. Idempotente: si ya estaba cerrada devuelve su estado actual. */
  finalizar(
    entrevistaId: number,
    duracionSegundos: number,
    tieneAudioCliente: boolean,
    esParcial: boolean,
  ): Observable<GrabacionDTO> {
    return this.http.post<GrabacionDTO>(ruta(entrevistaId, 'finalizar'), {
      duracionSegundos,
      tieneAudioCliente,
      esParcial,
    });
  }

  /**
   * POST /api/v1/grabaciones (multipart/form-data): subida del archivo completo.
   * Se conserva como respaldo; el flujo normal usa los fragmentos.
   */
  subir(entrevistaId: number, r: ResultadoGrabacion, esParcial: boolean): Observable<HttpEvent<GrabacionDTO>> {
    const form = new FormData();
    form.append('entrevistaId', String(entrevistaId));
    form.append('archivo', r.blob, `entrevista_${entrevistaId}.webm`);
    form.append('duracionSegundos', String(r.duracionSegundos));
    form.append('tieneAudioCliente', String(r.tieneAudioCliente));
    form.append('esParcial', String(esParcial));

    return this.http.post<GrabacionDTO>(BASE, form, {
      observe: 'events',
      reportProgress: true,
    });
  }
}

