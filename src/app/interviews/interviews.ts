import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { EntrevistaApi } from '../core/entrevista-api';
import { API_URL } from '../core/config';
import { RUTAS } from '../core/rutas';

import {
  EntrevistaListadoDTO,
  EstadoTranscripcion,
  Pagina
} from '../core/models';

import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';

interface ProductoFiltro {
  id: number;
  nombre: string;
}

@Component({
  selector: 'vc-interviews',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './interviews.html',
  styleUrl: './interviews.css'
})
export class Interviews implements OnInit {

  private readonly entrevistaApi = inject(EntrevistaApi);
  private readonly http = inject(HttpClient);

  /** Rutas absolutas para los enlaces de la plantilla. */
  protected readonly rutas = RUTAS;

  // ============================================
  // DATOS REALES
  // ============================================

  protected readonly entrevistas =
    signal<EntrevistaListadoDTO[]>([]);

  protected readonly productos =
    signal<ProductoFiltro[]>([]);

  protected readonly cargando = signal(false);
  protected readonly reintentandoId = signal<number | null>(null);

  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);

  // ============================================
  // FILTROS
  // ============================================

  protected readonly filtroProducto = signal('TODOS');
  protected readonly filtroEstado = signal('TODOS');

  // ============================================
  // PAGINACIÓN
  // ============================================

  // El frontend comienza en 1.
  // El backend comienza en 0.
  protected readonly paginaActual = signal(1);

  protected readonly elementosPorPagina = 10;

  protected readonly totalElementosBackend = signal(0);
  protected readonly totalPaginasBackend = signal(0);

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarEntrevistas();
  }

  // ============================================
  // CARGAR PRODUCTOS
  // ============================================

  private cargarProductos(): void {

    this.http.get<unknown>(
      `${API_URL}/productos?page=0`
    ).subscribe({
      next: (respuesta) => {

        // El endpoint puede devolver una página
        // o un arreglo de productos.

        let registros: unknown[] = [];

        if (Array.isArray(respuesta)) {
          registros = respuesta;
        } else if (
          respuesta !== null &&
          typeof respuesta === 'object' &&
          'content' in respuesta &&
          Array.isArray(respuesta.content)
        ) {
          registros = respuesta.content;
        }

        const productos = registros
          .filter(
            (item): item is {
              id: number;
              nombre: string;
            } =>
              item !== null &&
              typeof item === 'object' &&
              'id' in item &&
              'nombre' in item &&
              typeof item.id === 'number' &&
              typeof item.nombre === 'string'
          )
          .map(item => ({
            id: item.id,
            nombre: item.nombre
          }));

        this.productos.set(productos);
      },
      error: () => {
        // La tabla de entrevistas puede seguir funcionando
        // aunque falle la carga de productos.
        this.productos.set([]);
      }
    });
  }

  // ============================================
  // CARGAR ENTREVISTAS
  // ============================================

  protected cargarEntrevistas(): void {

    const paginaBackend = this.paginaActual() - 1;

    const productoId =
      this.filtroProducto() === 'TODOS'
        ? undefined
        : Number(this.filtroProducto());

    this.cargando.set(true);
    this.error.set(null);

    this.entrevistaApi
      .listarDetalladas(
        paginaBackend,
        productoId
      )
      .pipe(
        finalize(() => this.cargando.set(false))
      )
      .subscribe({
        next: (
          respuesta: Pagina<EntrevistaListadoDTO>
        ) => {

          this.entrevistas.set(respuesta.content ?? []);

          this.totalElementosBackend.set(
            respuesta.totalElements ?? 0
          );

          this.totalPaginasBackend.set(
            respuesta.totalPages ?? 0
          );
        },
        error: (err: HttpErrorResponse) => {

          this.entrevistas.set([]);
          this.totalElementosBackend.set(0);
          this.totalPaginasBackend.set(0);

          if (err.status === 401) {
            this.error.set(
              'Tu sesión ha expirado. Iniciá sesión nuevamente.'
            );
          } else if (err.status === 403) {
            this.error.set(
              'No tenés permisos para consultar entrevistas.'
            );
          } else {
            this.error.set(
              'No fue posible cargar las entrevistas. Verificá que el backend esté disponible.'
            );
          }
        }
      });
  }

  // ============================================
  // FILTRO LOCAL DE ESTADO DE TRANSCRIPCIÓN
  // ============================================

  protected readonly entrevistasFiltradas = computed(() => {

    const estado = this.filtroEstado();

    if (estado === 'TODOS') {
      return this.entrevistas();
    }

    return this.entrevistas().filter(
      entrevista =>
        entrevista.estadoTranscripcion === estado
    );
  });

  protected readonly entrevistasPaginadas = computed(
    () => this.entrevistasFiltradas()
  );

  protected readonly totalElementos = computed(() => {

    if (this.filtroEstado() !== 'TODOS') {
      return this.entrevistasFiltradas().length;
    }

    return this.totalElementosBackend();
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, this.totalPaginasBackend())
  );

  // ============================================
  // CAMBIAR FILTROS
  // ============================================

  protected cambiarProducto(valor: string): void {

    this.filtroProducto.set(valor);
    this.paginaActual.set(1);
    this.mensaje.set(null);

    this.cargarEntrevistas();
  }

  protected cambiarEstado(valor: string): void {

    this.filtroEstado.set(valor);
    this.mensaje.set(null);
  }

  // ============================================
  // PAGINACIÓN
  // ============================================

  protected paginaAnterior(): void {

    if (this.cargando() || this.paginaActual() <= 1) {
      return;
    }

    this.paginaActual.update(pagina => pagina - 1);
    this.cargarEntrevistas();
  }

  protected paginaSiguiente(): void {

    if (
      this.cargando() ||
      this.paginaActual() >= this.totalPaginas()
    ) {
      return;
    }

    this.paginaActual.update(pagina => pagina + 1);
    this.cargarEntrevistas();
  }

  // ============================================
  // REINTENTAR TRANSCRIPCIÓN
  // ============================================

  protected reintentar(entrevistaId: number): void {

    const entrevista = this.entrevistas().find(
      item => item.id === entrevistaId
    );

    if (
      !entrevista ||
      !entrevista.puedeReintentar ||
      entrevista.estadoTranscripcion !== 'CON_ERROR' ||
      entrevista.grabacionId === null ||
      this.reintentandoId() !== null
    ) {
      return;
    }

    this.reintentandoId.set(entrevistaId);
    this.mensaje.set(null);

    this.http.post(
      `${API_URL}/transcripciones/grabacion/${entrevista.grabacionId}/reintentar`,
      {}
    )
    .pipe(
      finalize(() => this.reintentandoId.set(null))
    )
    .subscribe({
      next: () => {

        this.mensaje.set(
          `Se solicitó el reintento de transcripción para la entrevista #${entrevistaId}.`
        );

        this.cargarEntrevistas();
      },
      error: (err: HttpErrorResponse) => {

        if (err.status === 403) {
          this.mensaje.set(
            'No tenés permisos para reintentar esta transcripción.'
          );
        } else if (err.status === 409) {
          this.mensaje.set(
            'La transcripción ya se encuentra en procesamiento.'
          );
        } else {
          this.mensaje.set(
            'No fue posible solicitar el reintento de transcripción.'
          );
        }
      }
    });
  }

  // ============================================
  // MENSAJES
  // ============================================

  protected cerrarMensaje(): void {
    this.mensaje.set(null);
  }

  // ============================================
  // FORMATO DE FECHAS Y DURACIONES
  // ============================================

  protected formatearFecha(
    fecha: string | null
  ): string {

    if (!fecha) return '—';

    const partes = fecha.substring(0, 10).split('-');

    if (partes.length !== 3) return '—';

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  protected formatearDuracion(
    segundos: number | null
  ): string {

    if (segundos === null || segundos < 0) {
      return '—';
    }

    const minutos = Math.floor(segundos / 60);
    const restantes = segundos % 60;

    return `${minutos.toString().padStart(2, '0')}:${restantes
      .toString()
      .padStart(2, '0')}`;
  }

  // ============================================
  // ESTADOS
  // ============================================

  protected textoEstado(
    estado: string | null
  ): string {

    if (!estado) return '—';

    const textos: Record<string, string> = {
      PENDIENTE: 'PENDIENTE',
      EN_PROCESO: 'EN PROCESO',
      COMPLETADA: 'COMPLETADA',
      CON_ERROR: 'CON ERROR',
      SIN_CONTENIDO: 'SIN CONTENIDO'
    };

    return textos[estado] ?? estado;
  }

  protected claseEstado(
    estado: string | null
  ): string {

    switch (estado) {

      case 'COMPLETADA':
        return 'estado-completada';

      case 'EN_PROCESO':
        return 'estado-proceso';

      case 'CON_ERROR':
        return 'estado-error';

      case 'PENDIENTE':
        return 'estado-pendiente';

      case 'SIN_CONTENIDO':
        return 'estado-sin-contenido';

      default:
        return 'estado-vacio';
    }
  }
}