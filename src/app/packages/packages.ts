import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { CompraApi } from '../core/compra-api';
import { CompraDTO, ConsumoSalaDTO, PaqueteDTO, SaldoSalasDTO } from '../core/models';
import { PaqueteApi } from '../core/paquete-api';
import { SaldoApi } from '../core/saldo-api';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';
import { PaquetesAdmin } from './paquetes-admin/paquetes-admin';
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

const PATRON_TITULAR = /^\p{L}+( \p{L}+)*$/u;
const PATRON_VENCIMIENTO = /^(0[1-9]|1[0-2])\/(\d{2})$/;

/** Dígito verificador de las tarjetas (algoritmo de Luhn), igual que en el back-end. */
function cumpleLuhn(numero: string): boolean {
  let suma = 0;
  let duplicar = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let digito = Number(numero[i]);
    if (duplicar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    duplicar = !duplicar;
  }
  return suma % 10 === 0;
}

/** Paquete con los datos derivados que muestra la tarjeta. */
interface PaqueteVista extends PaqueteDTO {
  precioPorSala: number;
  recomendado: boolean;
}

/** Catálogo de paquetes, pago simulado, saldo e historial de compras (RF-17, RF-18). */
@Component({
  imports: [Badge, Button, CurrencyPipe, DatePipe, DecimalPipe, Dialog, Field, MetricCard, PaquetesAdmin],
  selector: 'vc-packages',
  styleUrl: './packages.css',
  templateUrl: './packages.html',
})
export class Packages {
  private readonly paqueteApi = inject(PaqueteApi);
  private readonly compraApi = inject(CompraApi);
  private readonly saldoApi = inject(SaldoApi);
  private readonly sesion = inject(SessionService);

  private readonly usuario = this.sesion.usuario;

  /** Solo el cliente-administrador compra; el administrador de la plataforma ve el catálogo. */
  protected readonly puedeComprar = computed(() => {
    const u = this.usuario();
    return u?.rol === 'CLIENTE_ADMINISTRADOR' && u.empresaId !== null;
  });

  /** El administrador de la plataforma crea, edita y desactiva paquetes (RF-17). */
  protected readonly esAdministrador = computed(() => this.usuario()?.rol === 'ADMINISTRADOR');

  /**
   * Empresa cuyo saldo e historial se muestran: la del cliente-administrador, o la que el
   * administrador de la plataforma eligió en «Empresa que atiendes» (modo soporte, solo consulta).
   */
  protected readonly empresaConsultada = computed(() =>
    this.puedeComprar() || this.esAdministrador() ? this.sesion.empresaId() : null,
  );

  /** Se muestran el saldo y los historiales cuando hay una empresa que consultar. */
  protected readonly verSaldo = computed(() => this.empresaConsultada() !== null);

  // Anular compra (solo el administrador de la plataforma)
  protected readonly porAnular = signal<CompraDTO | null>(null);
  protected readonly anulando = signal(false);
  protected readonly avisoCompra = signal<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Catálogo
  protected readonly paquetes = signal<PaqueteDTO[]>([]);
  protected readonly cargandoPaquetes = signal(true);
  protected readonly errorPaquetes = signal<string | null>(null);

  /** Paquetes con precio por sala; se destaca el que eligió el administrador. */
  protected readonly vista = computed<PaqueteVista[]>(() => {
    // El recomendado lo elige el administrador (esRecomendado); si no hay ninguno, no se destaca ninguno.
    return this.paquetes().map((paquete) => ({
      ...paquete,
      precioPorSala: paquete.precio / paquete.cantidadSalas,
      recomendado: paquete.esRecomendado === true,
    }));
  });

  // Saldo e historial de consumo (RF-18)
  protected readonly saldo = signal<SaldoSalasDTO | null>(null);
  protected readonly errorSaldo = signal<string | null>(null);
  protected readonly consumos = signal<ConsumoSalaDTO[]>([]);
  protected readonly errorConsumos = signal<string | null>(null);

  // Historial
  protected readonly compras = signal<CompraDTO[]>([]);
  protected readonly cargandoCompras = signal(false);
  protected readonly errorCompras = signal<string | null>(null);

  /** Todos los paquetes (también inactivos), para mostrar el nombre en el historial del administrador. */
  private readonly todosLosPaquetes = signal<PaqueteDTO[]>([]);

  protected readonly historial = computed(() => {
    const nombres = new Map([...this.todosLosPaquetes(), ...this.paquetes()].map((p) => [p.id, p.nombre]));
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

  // Datos de la tarjeta de prueba (pago simulado)
  protected readonly titular = signal('');
  protected readonly numeroTarjeta = signal('');
  protected readonly vencimiento = signal('');
  protected readonly cvv = signal('');
  private readonly intento = signal(false);

  protected readonly errorTitular = computed(() => {
    if (!this.intento()) return null;
    const valor = this.titular().trim().replace(/\s+/g, ' ');
    if (valor.length < 2 || valor.length > 100 || !PATRON_TITULAR.test(valor)) {
      return 'Escribe el nombre como aparece en la tarjeta (solo letras).';
    }
    return null;
  });

  protected readonly errorNumero = computed(() => {
    if (!this.intento()) return null;
    const numero = this.numeroTarjeta().replace(/[\s-]/g, '');
    if (!/^\d{16}$/.test(numero) || !cumpleLuhn(numero)) {
      return 'El número de tarjeta no es válido.';
    }
    return null;
  });

  protected readonly errorVencimiento = computed(() => {
    if (!this.intento()) return null;
    const m = PATRON_VENCIMIENTO.exec(this.vencimiento().trim());
    if (!m) return 'Usa el formato MM/AA, por ejemplo 12/28.';
    const hoy = new Date();
    const anio = 2000 + Number(m[2]);
    const mes = Number(m[1]);
    if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)) {
      return 'La tarjeta está vencida.';
    }
    return null;
  });

  protected readonly errorCvv = computed(() => {
    if (!this.intento()) return null;
    return /^\d{3}$/.test(this.cvv().trim()) ? null : 'El CVV tiene 3 dígitos.';
  });

  constructor() {
    this.cargarPaquetes();
    // Se recargan el saldo y las compras al inicio y cada vez que el administrador cambia de empresa.
    effect(() => {
      const empresaId = this.empresaConsultada();
      untracked(() => {
        this.saldo.set(null);
        this.compras.set([]);
        this.consumos.set([]);
        this.avisoCompra.set(null);
        if (empresaId !== null) {
          this.cargarCompras();
          this.cargarSaldo();
        }
      });
    });
  }

  protected pedirAnular(compra: CompraDTO): void {
    this.avisoCompra.set(null);
    this.porAnular.set(compra);
  }

  protected cancelarAnular(): void {
    if (!this.anulando()) this.porAnular.set(null);
  }

  /** Anula una compra aprobada; el back-end no lo permite si sus salas ya se usaron o reservaron. */
  protected anular(): void {
    const compra = this.porAnular();
    if (!compra) return;
    this.anulando.set(true);
    this.compraApi.anular(compra.id).subscribe({
      next: () => {
        this.anulando.set(false);
        this.porAnular.set(null);
        this.avisoCompra.set({
          tipo: 'exito',
          texto: `Se anuló la compra ${compra.referenciaPago ?? '#' + compra.id}. Se descontaron ${compra.salasAcreditadas} salas del saldo.`,
        });
        this.cargarCompras();
        this.cargarSaldo();
      },
      error: (err: HttpErrorResponse) => {
        this.anulando.set(false);
        this.porAnular.set(null);
        this.avisoCompra.set({ tipo: 'error', texto: err?.error?.mensaje ?? 'No se pudo anular la compra.' });
      },
    });
  }

  protected cargarSaldo(): void {
    if (!this.verSaldo()) return;
    this.errorSaldo.set(null);
    this.saldoApi.obtener().subscribe({
      next: (saldo) => this.saldo.set(saldo),
      error: () => this.errorSaldo.set('No se pudo cargar el saldo de salas.'),
    });
    this.errorConsumos.set(null);
    this.saldoApi.consumos().subscribe({
      next: (lista) => this.consumos.set(lista),
      error: () => this.errorConsumos.set('No se pudo cargar el historial de consumo.'),
    });
  }

  protected cargarPaquetes(): void {
    if (this.esAdministrador()) {
      this.paqueteApi.listarTodos().subscribe({ next: (lista) => this.todosLosPaquetes.set(lista) });
    }
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
    const empresaId = this.empresaConsultada();
    if (empresaId === null) return;
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
    this.intento.set(false);
    this.titular.set('');
    this.numeroTarjeta.set('');
    this.vencimiento.set('');
    this.cvv.set('');
    this.elegido.set(paquete);
  }

  protected cancelar(): void {
    if (!this.comprando()) this.elegido.set(null);
  }

  /** Registra la compra con pago simulado: no se realiza ningún cobro real. */
  protected confirmar(): void {
    const paquete = this.elegido();
    if (!paquete || !this.puedeComprar()) return;

    this.intento.set(true);
    if (this.errorTitular() || this.errorNumero() || this.errorVencimiento() || this.errorCvv()) return;

    this.comprando.set(true);
    this.errorCompra.set(null);
    this.compraApi
      .crear({
        paqueteId: paquete.id,
        claveIdempotencia: this.claveCompra,
        titular: this.titular().trim(),
        numeroTarjeta: this.numeroTarjeta().replace(/[\s-]/g, ''),
        vencimiento: this.vencimiento().trim(),
        cvv: this.cvv().trim(),
      })
      .subscribe({
        next: (compra) => {
          this.comprando.set(false);
          this.compras.update((lista) => [compra, ...lista.filter((c) => c.id !== compra.id)]);
          // El CVV no se conserva en pantalla después de enviarlo.
          this.cvv.set('');
          this.intento.set(false);
          if (compra.estadoPago === 'RECHAZADO') {
            // Otro intento es otra compra: nueva clave de idempotencia.
            this.claveCompra = nuevaClave();
            const motivo = compra.referenciaPago?.split(' · ')[2];
            this.errorCompra.set(
              `El pago simulado fue rechazado${motivo ? `: ${motivo}` : ''}. No se acreditaron salas; prueba con otra tarjeta.`,
            );
            return;
          }
          this.compraExitosa.set(compra);
          this.elegido.set(null);
          this.cargarSaldo();
        },
        error: (err: HttpErrorResponse) => {
          this.comprando.set(false);
          this.errorCompra.set(err?.error?.mensaje ?? 'No se pudo registrar la compra. Intenta de nuevo.');
        },
      });
  }
}
