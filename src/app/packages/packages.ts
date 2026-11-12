import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { CompraApi } from '../core/compra-api';
import { CompraDTO, PaqueteDTO } from '../core/models';
import { PaqueteApi } from '../core/paquete-api';
import { Dialog } from '../dialog/dialog';
import { MetricCard } from '../metric-card/metric-card';
import { SessionService } from '../services/session';

/** UUID v4 para la clave de idempotencia; evita compras duplicadas si se pulsa dos veces. */
function nuevaClave(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Paquete con los datos derivados que muestra la tarjeta. */
interface PaqueteVista extends PaqueteDTO {
  precioPorSala: number;
  recomendado: boolean;
}

/** Catálogo de paquetes, pago simulado, saldo e historial de compras (RF-17, RF-18). */
@Component({
  imports: [Badge, Button, CurrencyPipe, DatePipe, DecimalPipe, Dialog, MetricCard],
  selector: 'vc-packages',
  styleUrl: './packages.css',
  templateUrl: './packages.html',
})
export class Packages {
  private readonly paqueteApi = inject(PaqueteApi);
  private readonly compraApi = inject(CompraApi);
  private readonly sesion = inject(SessionService);

  private readonly usuario = this.sesion.usuario;

  /** Solo el cliente-administrador compra; el administrador de la plataforma ve el catálogo. */
  protected readonly puedeComprar = computed(() => {
    const u = this.usuario();
    return u?.rol === 'CLIENTE_ADMINISTRADOR' && u.empresaId !== null;
  });

  // Catálogo
  protected readonly paquetes = signal<PaqueteDTO[]>([]);
  protected readonly cargandoPaquetes = signal(true);
  protected readonly errorPaquetes = signal<string | null>(null);

  /** Paquetes con precio por sala; el del medio se destaca igual que en el home. */
  protected readonly vista = computed<PaqueteVista[]>(() => {
    const lista = this.paquetes();
    const indiceRecomendado = Math.floor(lista.length / 2);
    return lista.map((paquete, indice) => ({
      ...paquete,
      precioPorSala: paquete.precio / paquete.cantidadSalas,
      recomendado: lista.length > 1 && indice === indiceRecomendado,
    }));
  });

  // Historial
  protected readonly compras = signal<CompraDTO[]>([]);
  protected readonly cargandoCompras = signal(false);
  protected readonly errorCompras = signal<string | null>(null);

  protected readonly historial = computed(() => {
    const nombres = new Map(this.paquetes().map((p) => [p.id, p.nombre]));
    return [...this.compras()]
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .map((c) => ({ ...c, paquete: nombres.get(c.paqueteId) ?? `Paquete #${c.paqueteId}` }));
  });

  // Compra
  protected readonly elegido = signal<PaqueteDTO | null>(null);
  protected readonly comprando = signal(false);
  protected readonly errorCompra = signal<string | null>(null);
  protected readonly compraExitosa = signal<CompraDTO | null>(null);
  private claveCompra = '';

  constructor() {
    this.cargarPaquetes();
    this.cargarCompras();
  }

  protected cargarPaquetes(): void {
    this.cargandoPaquetes.set(true);
    this.errorPaquetes.set(null);
    this.paqueteApi.listarActivos().subscribe({
      next: (lista) => {
        this.paquetes.set([...lista].sort((a, b) => a.precio - b.precio));
        this.cargandoPaquetes.set(false);
      },
      error: () => {
        this.errorPaquetes.set('No se pudo cargar el catálogo de paquetes.');
        this.cargandoPaquetes.set(false);
      },
    });
  }

  protected cargarCompras(): void {
    const empresaId = this.usuario()?.empresaId;
    if (!this.puedeComprar() || empresaId == null) return;
    this.cargandoCompras.set(true);
    this.errorCompras.set(null);
    this.compraApi.listarPorEmpresa(empresaId).subscribe({
      next: (lista) => {
        this.compras.set(lista);
        this.cargandoCompras.set(false);
      },
      error: () => {
        this.errorCompras.set('No se pudo cargar el historial de compras.');
        this.cargandoCompras.set(false);
      },
    });
  }

  protected elegir(paquete: PaqueteDTO): void {
    this.claveCompra = nuevaClave();
    this.errorCompra.set(null);
    this.compraExitosa.set(null);
    this.elegido.set(paquete);
  }

  protected cancelar(): void {
    if (!this.comprando()) this.elegido.set(null);
  }

  /** Registra la compra con pago simulado: no se realiza ningún cobro real. */
  protected confirmar(): void {
    const paquete = this.elegido();
    const u = this.usuario();
    if (!paquete || !u || u.empresaId === null) return;

    this.comprando.set(true);
    this.errorCompra.set(null);
    this.compraApi
      .crear({
        empresaId: u.empresaId,
        cuentaId: u.id,
        paqueteId: paquete.id,
        estadoPago: 'APROBADO',
        referenciaPago: `SIMULADO-${this.claveCompra.slice(0, 8).toUpperCase()}`,
        claveIdempotencia: this.claveCompra,
      })
      .subscribe({
        next: (compra) => {
          this.compras.update((lista) => [compra, ...lista]);
          this.compraExitosa.set(compra);
          this.comprando.set(false);
          this.elegido.set(null);
        },
        error: (err: HttpErrorResponse) => {
          this.comprando.set(false);
          this.errorCompra.set(err?.error?.mensaje ?? 'No se pudo registrar la compra. Intenta de nuevo.');
        },
      });
  }
}