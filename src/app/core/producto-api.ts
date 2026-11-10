import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { ProductoDTO } from './models';

@Injectable({ providedIn: 'root' })
export class ProductoApi {
  private http = inject(HttpClient);

   /** GET /api/productos: productos (activos e inactivos) de la empresa del usuario autenticado. */
  listar(): Observable<ProductoDTO[]> {
    return this.http.get<ProductoDTO[]>(`${API_URL}/productos`);
  }

  /** GET /api/productos/{id} */
  obtener(id: number): Observable<ProductoDTO> {
    return this.http.get<ProductoDTO>(`${API_URL}/productos/${id}`);
  }

  /** POST /api/productos */
  crear(producto: ProductoDTO): Observable<ProductoDTO> {
    return this.http.post<ProductoDTO>(`${API_URL}/productos`, producto);
  }

  /** PUT /api/productos/{id}: el backend reemplaza nombre, descripción y categoría, así que se envían completos. */
  actualizar(id: number, producto: ProductoDTO): Observable<ProductoDTO> {
    return this.http.put<ProductoDTO>(`${API_URL}/productos/${id}`, producto);
  }

  /** PATCH /api/productos/{id}/desactivar */
  desactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${API_URL}/productos/${id}/desactivar`, null);
  }
}
