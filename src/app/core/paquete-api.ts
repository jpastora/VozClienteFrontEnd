import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { PaqueteDTO } from './models';

@Injectable({ providedIn: 'root' })
export class PaqueteApi {
  private http = inject(HttpClient);

  /** GET /api/paquetes/activos: catálogo de paquetes que se pueden comprar. */
  listarActivos(): Observable<PaqueteDTO[]> {
    return this.http.get<PaqueteDTO[]>(`${API_URL}/paquetes/activos`);
  }
}
