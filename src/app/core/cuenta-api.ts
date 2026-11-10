import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import { CuentaDTO } from './models';

@Injectable({
  providedIn: 'root',
})
export class CuentaApi {
  private readonly http = inject(HttpClient);

  /**
   * Obtiene las cuentas de la empresa
   * del usuario autenticado.
   */
  listar(): Observable<CuentaDTO[]> {
    return this.http.get<CuentaDTO[]>(
      `${API_URL}/cuentas`
    );
  }
}
