import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '../button/button';
import { PanelApi } from '../core/panel-api';
import { ConteoDTO, PanelGlobalDTO } from '../core/models';
import { MetricCard } from '../metric-card/metric-card';

const ETIQUETAS_ESTADO: Record<string, string> = {
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  FALLIDA: 'Fallida',
};

const ETIQUETAS_INTENCION: Record<string, string> = {
  RECOMPRARIA: 'Recompraría',
  NO_RECOMPRARIA: 'No recompraría',
  RECHAZA: 'Rechaza',
  NEUTRAL: 'Neutral',
};

/** Fila de una distribución con su porcentaje sobre el total. */
interface FilaDistribucion {
  clave: string;
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
}

/**
 * Panel global del administrador de la plataforma (RF-19): ingresos, empresas, entrevistas,
 * intención de compra global y clientes principales de todas las empresas.
 */
@Component({
  imports: [Button, CurrencyPipe, DecimalPipe, MetricCard],
  selector: 'vc-panel-global',
  styleUrl: './panel-global.css',
  templateUrl: './panel-global.html',
})
export class PanelGlobal {
  private readonly api = inject(PanelApi);

  protected readonly panel = signal<PanelGlobalDTO | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly entrevistasPorEstado = computed(() =>
    this.distribucion(this.panel()?.entrevistasPorEstado ?? [], ETIQUETAS_ESTADO),
  );

  protected readonly intencion = computed(() =>
    this.distribucion(this.panel()?.intencionGlobal ?? [], ETIQUETAS_INTENCION),
  );

  /** Ingreso más alto entre los clientes principales, para dimensionar las barras. */
  protected readonly maxIngreso = computed(() =>
    Math.max(1, ...(this.panel()?.clientesPrincipales ?? []).map((c) => c.ingresos)),
  );

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.obtener().subscribe({
      next: (panel) => {
        this.panel.set(panel);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el panel global.');
        this.cargando.set(false);
      },
    });
  }

  protected anchoBarra(ingresos: number): number {
    return Math.round((ingresos / this.maxIngreso()) * 100);
  }

  private distribucion(conteos: ConteoDTO[], etiquetas: Record<string, string>): FilaDistribucion[] {
    const total = conteos.reduce((suma, c) => suma + c.cantidad, 0);
    return conteos.map((c) => ({
      clave: c.clave,
      etiqueta: etiquetas[c.clave] ?? c.clave,
      cantidad: c.cantidad,
      porcentaje: total === 0 ? 0 : Math.round((c.cantidad / total) * 100),
    }));
  }
}
