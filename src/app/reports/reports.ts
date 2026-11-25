import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { EstadisticasPdf } from '../core/estadisticas-pdf';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  Subject,
  of,
  switchMap,
  catchError,
  map,
} from 'rxjs';

import { Button } from '../button/button';
import { MetricCard } from '../metric-card/metric-card';

import { ProductoApi } from '../core/producto-api';
import { EstadisticasApi } from '../core/estadisticas-api';

import {
  ProductoDTO,
  EstadisticasDTO,
  FiltrosEstadisticas,
  IntencionEstadistica,
} from '../core/models';

@Component({
  imports: [Button, MetricCard],
  selector: 'vc-reports',
  styleUrl: './reports.css',
  templateUrl: './reports.html',
})
export class Reports implements OnInit {

  private readonly productoApi = inject(ProductoApi);
  private readonly estadisticasApi = inject(EstadisticasApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadisticasPdf = inject(EstadisticasPdf);

  private readonly consultas$ =
    new Subject<FiltrosEstadisticas | null>();

  // ======================================================
  // ESTADO
  // ======================================================

  readonly productos = signal<ProductoDTO[]>([]);

  readonly estadisticas = signal<EstadisticasDTO | null>(null);

  readonly cargando = signal(false);
  readonly cargandoProductos = signal(false);

  readonly error = signal('');
  readonly errorProductos = signal('');

  // ======================================================
  // FILTROS
  // ======================================================

  readonly productoId = signal<number | null>(null);

  readonly desde = signal('');
  readonly hasta = signal('');

  readonly fechasInvalidas = computed(() => {
    const desde = this.desde();
    const hasta = this.hasta();

    return !!desde && !!hasta && desde > hasta;
  });

  // ======================================================
  // DISTRIBUCIÓN DE INTENCIONES
  // ======================================================

  readonly etiquetasIntencion: Record<IntencionEstadistica, string> = {
    RECOMPRARIA: 'Recompraría',
    NO_RECOMPRARIA: 'No recompraría',
    RECHAZA: 'Rechaza',
    NEUTRAL: 'Neutral',
  };

  readonly coloresIntencion: Record<IntencionEstadistica, string> = {
    RECOMPRARIA: '#25845c',
    NO_RECOMPRARIA: '#e69a32',
    RECHAZA: '#cf4444',
    NEUTRAL: '#94a3b8',
  };

  // ======================================================
  // MÉTRICAS
  // ======================================================

  readonly entrevistasAnalizadas = computed(() => {
    return this.estadisticas()?.entrevistasAnalizadas ?? 0;
  });

  readonly intencionCompra = computed(() => {
    return this.estadisticas()?.intencionCompra ?? 0;
  });

  readonly mencionesCompetencia = computed(() => {
    return this.estadisticas()?.mencionesCompetencia ?? 0;
  });

  readonly distribucion = computed(() => {
    return this.estadisticas()?.distribucionIntencion ?? [];
  });

  readonly competidores = computed(() => {
    return this.estadisticas()?.competidores ?? [];
  });

  readonly hayDatos = computed(() => {
    return this.entrevistasAnalizadas() > 0;
  });

  // ======================================================
  // GRÁFICO CIRCULAR
  // ======================================================

  readonly graficoIntencion = computed(() => {

    const total = this.entrevistasAnalizadas();

    if (total === 0) {
      return 'conic-gradient(#e5e7eb 0% 100%)';
    }

    let acumulado = 0;

    const segmentos = this.distribucion()
      .filter(item => item.cantidad > 0)
      .map(item => {

        const inicio = acumulado;

        acumulado += (item.cantidad / total) * 100;

        const color = this.coloresIntencion[item.intencion];

        return `${color} ${inicio}% ${acumulado}%`;
      });

    return segmentos.length
      ? `conic-gradient(${segmentos.join(', ')})`
      : 'conic-gradient(#e5e7eb 0% 100%)';
  });

  // ======================================================
  // INICIALIZACIÓN
  // ======================================================

  ngOnInit(): void {

    this.configurarConsultas();

    this.cargarProductos();

    this.cargarEstadisticas();
  }

  // ======================================================
  // PRODUCTOS
  // ======================================================

  cargarProductos(): void {

    this.cargandoProductos.set(true);
    this.errorProductos.set('');

    this.productoApi.listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: productos => {

          this.productos.set(productos);

          this.cargandoProductos.set(false);
        },

        error: () => {

          this.errorProductos.set(
            'No fue posible cargar los productos.'
          );

          this.cargandoProductos.set(false);
        },
      });
  }

  // ======================================================
  // CONSULTAS DE ESTADÍSTICAS
  // ======================================================

  private configurarConsultas(): void {

    this.consultas$
      .pipe(

        switchMap(filtros => {

          if (filtros === null) {
            return of(null);
          }

          return this.estadisticasApi.obtener(filtros)
            .pipe(

              map(datos => ({
                datos,
                error: '',
              })),

              catchError(() => of({
                datos: null,
                error: 'No fue posible cargar las estadísticas.',
              })),
            );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(resultado => {

        this.cargando.set(false);

        if (resultado === null) {
          this.estadisticas.set(null);
          return;
        }

        this.estadisticas.set(resultado.datos);
        this.error.set(resultado.error);
      });
  }

  cargarEstadisticas(): void {

    this.error.set('');
    this.estadisticas.set(null);

    if (this.fechasInvalidas()) {

      this.consultas$.next(null);

      this.error.set(
        'La fecha desde no puede ser posterior a la fecha hasta.'
      );

      return;
    }

    const filtros: FiltrosEstadisticas = {};

    const productoId = this.productoId();

    if (productoId !== null) {
      filtros.productoId = productoId;
    }

    if (this.desde()) {
      filtros.desde = this.desde();
    }

    if (this.hasta()) {
      filtros.hasta = this.hasta();
    }

    this.cargando.set(true);

    this.consultas$.next(filtros);
  }

  // ======================================================
  // EVENTOS DE FILTROS
  // ======================================================

  cambiarProducto(valor: string): void {

    this.productoId.set(
      valor === '' ? null : Number(valor)
    );

    this.cargarEstadisticas();
  }

  cambiarDesde(valor: string): void {

    this.desde.set(valor);

    this.cargarEstadisticas();
  }

  cambiarHasta(valor: string): void {

    this.hasta.set(valor);

    this.cargarEstadisticas();
  }

  limpiarFiltros(): void {

    this.productoId.set(null);

    this.desde.set('');
    this.hasta.set('');

    this.cargarEstadisticas();
  }

  actualizarEstadisticas(): void {

    this.cargarEstadisticas();
  }

  // ======================================================
  // FORMATO
  // ======================================================

  formatearPorcentaje(valor: number): string {

    return `${valor.toLocaleString('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}%`;
  }

  // PDF

  descargarReporte(): void {

    const datos = this.estadisticas();

    if (!datos || this.cargando() || this.fechasInvalidas()) {
      return;
    }

    const producto = this.productos()
      .find(item => item.id === this.productoId());

    this.estadisticasPdf.descargar(
      datos,
      producto?.nombre ?? 'Todos los productos',
      this.desde(),
      this.hasta()
    );
  }

}