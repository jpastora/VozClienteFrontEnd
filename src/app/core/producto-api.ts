import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { ProductoDTO, ProductoRequest } from './models';

export interface PaginaProductos {
  content: ProductoDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type EstadoProducto = 'ACTIVO' | 'INACTIVO' | '';

@Injectable({ providedIn: 'root' })
export class ProductoApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/productos`;

  // HU-06: listado paginado y filtrado desde PostgreSQL
  listarPaginado(
    page = 0,
    nombre = '',
    estado: EstadoProducto = ''
  ): Observable<PaginaProductos> {
    let params = new HttpParams()
      .set('page', page.toString());

    if (nombre.trim()) {
      params = params.set('nombre', nombre.trim());
    }

    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<PaginaProductos>(
      this.url,
      { params }
    );
  }

  // Compatibilidad con componentes que necesitan
  // el catálogo completo.
  listar(): Observable<ProductoDTO[]> {
    return new Observable<ProductoDTO[]>((subscriber) => {
      const productos: ProductoDTO[] = [];

      const cargarPagina = (page: number) => {
        const subscription = this.listarPaginado(page).subscribe({
          next: (respuesta) => {
            productos.push(...respuesta.content);

            if (page + 1 < respuesta.totalPages) {
              cargarPagina(page + 1);
            } else {
              subscriber.next(productos);
              subscriber.complete();
            }
          },
          error: (error) => subscriber.error(error),
        });

        subscriber.add(subscription);
      };

      cargarPagina(0);
    });
  }

  // HU-06: detalle del producto
  obtener(id: number): Observable<ProductoDTO> {
    return this.http.get<ProductoDTO>(
      `${this.url}/${id}`
    );
  }

  // HU-04: registrar producto
  crear(producto: ProductoRequest): Observable<ProductoDTO> {
    return this.http.post<ProductoDTO>(
      this.url,
      producto
    );
  }

  actualizar(
    id: number,
    producto: ProductoRequest
  ): Observable<ProductoDTO> {
    return this.http.put<ProductoDTO>(
      `${this.url}/${id}`,
      producto
    );
  }

  desactivar(id: number): Observable<void> {
    return this.http.patch<void>(
      `${this.url}/${id}/desactivar`,
      null
    );
  }
}
