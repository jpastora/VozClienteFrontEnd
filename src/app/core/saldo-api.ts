import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { ConsumoSalaDTO, SaldoSalasDTO } from './models';

/** Saldo de salas e historial de consumo de la empresa con sesión (RF-17, RF-18). */
@Injectable({ providedIn: 'root' })
export class SaldoApi {
  private http = inject(HttpClient);

  /** GET /api/saldo: acreditadas, consumidas, reservadas, saldo y disponibles. */
  obtener(): Observable<SaldoSalasDTO> {
    return this.http.get<SaldoSalasDTO>(`${API_URL}/saldo`);
  }

  /** GET /api/saldo/consumos: salas descontadas, la más reciente primero. */
  consumos(): Observable<ConsumoSalaDTO[]> {
    return this.http.get<ConsumoSalaDTO[]>(`${API_URL}/saldo/consumos`);
  }
}
