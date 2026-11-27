import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { Badge } from './badge/badge';
import { Button } from './button/button';
import { EntrevistaApi } from './core/entrevista-api';
import { EstadisticasApi } from './core/estadisticas-api';
import {
  EntrevistaListadoDTO,
  EstadisticasDTO,
  EstadoEntrevista,
  Pagina,
  SaldoSalasDTO,
} from './core/models';
import { PaginaProductos, ProductoApi } from './core/producto-api';
import { RUTAS } from './core/rutas';
import { SaldoApi } from './core/saldo-api';
import { MetricCard } from './metric-card/metric-card';

type Tono = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const ETIQUETAS_ESTADO: Record<EstadoEntrevista, string> = {
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  FALLIDA: 'Fallida',
};

const TONOS_ESTADO: Record<EstadoEntrevista, Tono> = {
  EN_CURSO: 'warning',
  FINALIZADA: 'success',
  FALLIDA: 'danger',
};

const ETIQUETAS_INTENCION: Record<string, string> = {
  RECOMPRARIA: 'Recompraría',
  NO_RECOMPRARIA: 'No recompraría',
  RECHAZA: 'Rechaza',
  NEUTRAL: 'Neutral',
};

const TONOS_INTENCION: Record<string, Tono> = {
  RECOMPRARIA: 'success',
  NO_RECOMPRARIA: 'warning',
  RECHAZA: 'danger',
  NEUTRAL: 'neutral',
};

/** Cantidad de entrevistas que se muestran en «Entrevistas recientes». */
const RECIENTES = 5;

/**
 * Inicio del cliente-administrador: resumen de la empresa.
 *
 * Reutiliza los mismos servicios de las demás pantallas (saldo, productos, entrevistas y
 * estadísticas). Cada consulta falla por separado: si una no responde, solo su tarjeta
 * queda en «—» y el resto de la pantalla sigue funcionando.
 */
@Component({
  imports: [Badge, Button, DecimalPipe, MetricCard, RouterLink],
  selector: 'vc-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  private readonly saldoApi = inject(SaldoApi);
  private readonly productoApi = inject(ProductoApi);
  private readonly entrevistaApi = inject(EntrevistaApi);
  private readonly estadisticasApi = inject(EstadisticasApi);

  protected readonly rutas = RUTAS;

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly saldo = signal<SaldoSalasDTO | null>(null);
  protected readonly productosActivos = signal<number | null>(null);
  protected readonly totalEntrevistas = signal<number | null>(null);
  protected readonly estadisticas = signal<EstadisticasDTO | null>(null);
  protected readonly recientes = signal<EntrevistaListadoDTO[]>([]);

  /** Intención de compra de cada entrevista reciente (id → clave), según su análisis. */
  private readonly intenciones = signal<Record<number, string | null>>({});

  protected readonly intencionGlobal = computed(() => {
    const datos = this.estadisticas();
    return datos && datos.entrevistasAnalizadas > 0
      ? `${datos.intencionCompra.toLocaleString('es-CR', { maximumFractionDigits: 2 })}%`
      : '—';
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    forkJoin({
      saldo: this.saldoApi.obtener().pipe(catchError(() => of(null))),
      productos: this.productoApi
        .listarPaginado(0, '', 'ACTIVO')
        .pipe(catchError(() => of(null as PaginaProductos | null))),
      entrevistas: this.entrevistaApi
        .listarDetalladas(0)
        .pipe(catchError(() => of(null as Pagina<EntrevistaListadoDTO> | null))),
      estadisticas: this.estadisticasApi.obtener().pipe(catchError(() => of(null))),
    }).subscribe((r) => {
      this.saldo.set(r.saldo);
      this.productosActivos.set(r.productos?.totalElements ?? null);
      this.totalEntrevistas.set(r.entrevistas?.totalElements ?? null);
      this.estadisticas.set(r.estadisticas);

      const recientes = (r.entrevistas?.content ?? []).slice(0, RECIENTES);
      this.recientes.set(recientes);
      this.cargarIntenciones(recientes);

      if (!r.saldo && !r.productos && !r.entrevistas && !r.estadisticas) {
        this.error.set('No se pudo cargar el resumen de tu empresa.');
      }
      this.cargando.set(false);
    });
  }

  /** El listado solo trae el estado del análisis; la intención está en el detalle de cada entrevista. */
  private cargarIntenciones(entrevistas: EntrevistaListadoDTO[]): void {
    this.intenciones.set({});
    for (const e of entrevistas) {
      if (e.estadoAnalisis !== 'COMPLETADA') continue;
      this.entrevistaApi
        .obtenerDetalle(e.id)
        .pipe(catchError(() => of(null)))
        .subscribe((detalle) =>
          this.intenciones.update((actual) => ({
            ...actual,
            [e.id]: detalle?.analisis?.intencion ?? null,
          })),
        );
    }
  }

  protected etiquetaEstado(estado: EstadoEntrevista): string {
    return ETIQUETAS_ESTADO[estado] ?? estado;
  }

  protected tonoEstado(estado: EstadoEntrevista): Tono {
    return TONOS_ESTADO[estado] ?? 'neutral';
  }

  protected intencion(e: EntrevistaListadoDTO): { texto: string; tono: Tono } | null {
    const clave = this.intenciones()[e.id];
    if (!clave) return null;
    return { texto: ETIQUETAS_INTENCION[clave] ?? clave, tono: TONOS_INTENCION[clave] ?? 'neutral' };
  }

  /** Texto cuando todavía no hay intención: análisis en curso, con error o sin análisis. */
  protected textoSinIntencion(e: EntrevistaListadoDTO): string {
    switch (e.estadoAnalisis) {
      case 'PENDIENTE':
      case 'EN_PROCESO':
        return 'Analizando…';
      case 'CON_ERROR':
        return 'Con error';
      case 'COMPLETADA':
        return this.intenciones()[e.id] === undefined ? '…' : '—';
      default:
        return '—';
    }
  }

  /** dd/mm/aaaa, igual que la pantalla de Entrevistas. */
  protected formatearFecha(fecha: string | null): string {
    if (!fecha) return '—';
    const partes = fecha.substring(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : '—';
  }
}
