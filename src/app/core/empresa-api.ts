import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from './config';
import { EmpresaDTO } from './models';

/** Empresas de la plataforma (/api/empresas). Solo el administrador de la plataforma tiene permiso. */
@Injectable({ providedIn: 'root' })
export class EmpresaApi {
  private readonly http = inject(HttpClient);

  /** Sube cada vez que se crea o renombra una empresa, para que otras pantallas (menú) recarguen su lista. */
  readonly cambios = signal(0);

  /** GET /api/empresas: todas las empresas. */
  listar(): Observable<EmpresaDTO[]> {
    return this.http.get<EmpresaDTO[]>(`${API_URL}/empresas`);
  }

  /** POST /api/empresas. */
  crear(nombre: string): Observable<EmpresaDTO> {
    return this.http.post<EmpresaDTO>(`${API_URL}/empresas`, { nombre }).pipe(tap(() => this.avisarCambio()));
  }

  /** PUT /api/empresas/{id}: cambia el nombre. */
  renombrar(id: number, nombre: string): Observable<EmpresaDTO> {
    return this.http.put<EmpresaDTO>(`${API_URL}/empresas/${id}`, { nombre }).pipe(tap(() => this.avisarCambio()));
  }

  private avisarCambio(): void {
    this.cambios.update((n) => n + 1);
  }
}
