import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { CompraDTO, CompraRequest } from './models';

@Injectable({ providedIn: 'root' })
export class CompraApi {
  private http = inject(HttpClient);

  /** POST /api/compras (RF-18). El back-end toma monto y salas del paquete. */
  crear(compra: CompraRequest): Observable<CompraDTO> {
    return this.http.post<CompraDTO>(`${API_URL}/compras`, compra);
  }

  /** GET /api/compras/empresa/{empresaId}: historial de compras de la empresa. */
  listarPorEmpresa(empresaId: number): Observable<CompraDTO[]> {
    return this.http.get<CompraDTO[]>(`${API_URL}/compras/empresa/${empresaId}`);
  }
}
