import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { Field } from '../field/field';
import { ProductoDTO } from '../core/models';
import {
  ProductoApi,
  EstadoProducto
} from '../core/producto-api';
import { RUTAS } from '../core/rutas';
import { ProductForm } from '../product-form/product-form';

@Component({
  selector: 'vc-products',
  standalone: true,
  imports: [
    Badge,
    Button,
    Field,
    DatePipe,
    RouterLink,
    ProductForm
  ],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class Products implements OnDestroy {

  private readonly api = inject(ProductoApi);
  private readonly destroy$ = new Subject<void>();

  // HU-06: paginación de 10 productos
  protected readonly porPagina = 10;

  /** Rutas absolutas para los enlaces de la plantilla. */
  protected readonly rutas = RUTAS;

  // Siempre debe ser un arreglo, nunca undefined.
  protected readonly productos = signal<ProductoDTO[]>([]);

  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);

  // Filtros del catálogo
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<EstadoProducto>('');

  // Angular muestra páginas desde 1.
  // Spring Data utiliza páginas desde 0.
  protected readonly pagina = signal(1);

  protected readonly totalElementos = signal(0);
  protected readonly totalPaginas = signal(0);

  protected readonly paginas = computed(() =>
    Array.from(
      { length: this.totalPaginas() },
      (_, i) => i + 1
    )
  );

  protected readonly paginaActual = computed(
    () => this.pagina()
  );

  protected readonly visibles = computed(
    () => this.productos()
  );

  // HU-04: formulario de registro y edición
  protected readonly formAbierto = signal(false);
  protected readonly enEdicion = signal<ProductoDTO | null>(null);

  // Evita que respuestas antiguas sobrescriban las nuevas.
  private solicitudActual = 0;

  // Control de búsqueda con debounce
  private temporizadorBusqueda?: ReturnType<typeof setTimeout>;

  constructor() {
    this.cargar();
  }

  // HU-06: consultar productos paginados
  protected cargar(): void {
    const solicitud = ++this.solicitudActual;

    this.cargando.set(true);
    this.errorCarga.set(null);

    this.api.listarPaginado(
      this.pagina() - 1,
      this.busqueda(),
      this.filtroEstado()
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (respuesta) => {
        if (solicitud !== this.solicitudActual) {
          return;
        }

        // Evita asignar undefined a la señal.
        const contenido = Array.isArray(respuesta)
          ? respuesta
          : Array.isArray(respuesta?.content)
            ? respuesta.content
            : [];

        this.productos.set(contenido);

        this.totalElementos.set(
          Array.isArray(respuesta)
            ? contenido.length
            : respuesta?.totalElements ?? 0
        );

        this.totalPaginas.set(
          Array.isArray(respuesta)
            ? Math.ceil(contenido.length / this.porPagina)
            : respuesta?.totalPages ?? 0
        );

        this.cargando.set(false);
      },

      error: (error) => {
        if (solicitud !== this.solicitudActual) {
          return;
        }

        this.productos.set([]);
        this.totalElementos.set(0);
        this.totalPaginas.set(0);

        if (error.status === 401) {
          this.errorCarga.set(
            'Su sesión ha expirado. Inicie sesión nuevamente.'
          );
        } else if (error.status === 403) {
          this.errorCarga.set(
            'No tiene permisos para consultar productos.'
          );
        } else {
          this.errorCarga.set(
            'No se pudo cargar el catálogo de productos.'
          );
        }

        this.cargando.set(false);
      }
    });
  }

  // HU-06: buscar productos por nombre
  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);

    clearTimeout(this.temporizadorBusqueda);

    this.temporizadorBusqueda = setTimeout(
      () => this.cargar(),
      350
    );
  }

  // HU-06: filtrar productos por estado
  protected cambiarEstado(evento: Event): void {
    const valor = (
      evento.target as HTMLSelectElement
    ).value as EstadoProducto;

    clearTimeout(this.temporizadorBusqueda);

    this.filtroEstado.set(valor);
    this.pagina.set(1);

    this.cargar();
  }

  // HU-06: cambiar de página
  protected irAPagina(numero: number): void {
    if (
      numero < 1 ||
      numero > this.totalPaginas() ||
      numero === this.pagina()
    ) {
      return;
    }

    clearTimeout(this.temporizadorBusqueda);

    this.pagina.set(numero);
    this.cargar();
  }

  // HU-04: abrir formulario de nuevo producto
  protected abrirNuevo(): void {
    this.enEdicion.set(null);
    this.formAbierto.set(true);
  }

  // Abrir formulario para editar producto
  protected abrirEditar(producto: ProductoDTO): void {
    this.enEdicion.set(producto);
    this.formAbierto.set(true);
  }

  // Cerrar formulario
  protected cerrarFormulario(): void {
    this.formAbierto.set(false);
    this.enEdicion.set(null);
  }

  // Recargar listado después de guardar
  protected alGuardar(_guardado: ProductoDTO): void {
    this.cerrarFormulario();

    // Volver a la primera página para actualizar
    // el catálogo desde PostgreSQL.
    this.pagina.set(1);
    this.cargar();
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorBusqueda);

    this.destroy$.next();
    this.destroy$.complete();
  }
}