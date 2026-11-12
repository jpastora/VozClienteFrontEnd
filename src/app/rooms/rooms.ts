import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { CUENTA_ID_PRUEBA, urlBase } from '../core/config';
import { EntrevistaApi } from '../core/entrevista-api';
import { CuentaDTO, ProductoDTO, SalaDTO } from '../core/models';
import { ProductoApi } from '../core/producto-api';
import { RepresentanteApi } from '../core/representante-api';
import { SalaApi } from '../core/sala-api';
import { GuiaPreguntas } from '../guia-preguntas/guia-preguntas';
import { SessionService } from '../services/session';

type TonoBadge = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const CLAVE_PRODUCTO = 'vc.salas.producto';

/** Estado que se muestra: una sala pendiente cuya fecha de vencimiento ya pasó cuenta como expirada. */
function estadoVigente(sala: SalaDTO): string {
  if (sala.estado === 'PENDIENTE' && sala.venceEn && new Date(sala.venceEn).getTime() < Date.now()) return 'EXPIRADO';
  return sala.estado;
}

/**
 * Salas y videollamada: el representante (o el administrador del cliente) elige un producto y genera
 * los enlaces de la videollamada. Es la parte de "generar enlace" y el historial de `product-detail`.
 */
@Component({
  imports: [Badge, Button, DatePipe, GuiaPreguntas],
  selector: 'vc-rooms',
  styleUrl: './rooms.css',
  templateUrl: './rooms.html',
})
export class Rooms {
  private readonly productoApi = inject(ProductoApi);
  private readonly salaApi = inject(SalaApi);
  private readonly representanteApi = inject(RepresentanteApi);
  private readonly entrevistaApi = inject(EntrevistaApi);
  private readonly sesion = inject(SessionService);

  protected readonly usuario = this.sesion.usuario;
  protected readonly esRepresentante = computed(() => this.usuario()?.rol === 'REPRESENTANTE');
  protected readonly sesionEmpresaId = computed(() => this.usuario()?.empresaId ?? null);
  private readonly cuentaId = computed(() => this.usuario()?.id ?? CUENTA_ID_PRUEBA);

  protected readonly productos = signal<ProductoDTO[]>([]);
  protected readonly productoId = signal<number | null>(null);
  protected readonly producto = computed(() => this.productos().find((p) => p.id === this.productoId()) ?? null);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cargandoSalas = signal(false);
  protected readonly salas = signal<SalaDTO[]>([]);

  /** Solo el administrador del cliente elige representante; el representante atiende sus propias salas. */
  protected readonly representantes = signal<CuentaDTO[]>([]);
  protected readonly representanteId = signal<number | null>(null);

  /** Guía de preguntas elegida para el representante (null = sin guía). */
  protected readonly guiaId = signal<number | null>(null);

  protected readonly generando = signal(false);
  protected readonly errorEnlace = signal<string | null>(null);
  protected readonly enlaceConsumidor = signal<string | null>(null);
  protected readonly enlaceRepresentante = signal<string | null>(null);
  protected readonly copiado = signal<'consumidor' | 'representante' | null>(null);

  protected readonly copiadoFila = signal<string | null>(null);
  protected readonly filaExpandida = signal<string | null>(null);

  protected readonly filas = computed(() =>
    [...this.salas()]
      .sort((a, b) => (b.emitidaEn ?? '').localeCompare(a.emitidaEn ?? ''))
      .map((s) => ({ ...s, vigente: estadoVigente(s) })),
  );

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    if (!this.esRepresentante()) {
      this.representanteApi.listar().subscribe({
        next: (cuentas) => {
          const reps = cuentas.filter((c) => c.rol === 'REPRESENTANTE' && c.estado !== 'INACTIVA');
          this.representantes.set(reps);
          this.aplicarRepresentanteAsignado();
        },
        error: () => this.representantes.set([]),
      });
    }

    this.productoApi.listar().subscribe({
      next: (lista) => {
        // El backend ya devuelve solo los productos del representante; este filtro es un refuerzo.
        const miId = this.usuario()?.id;
        const visibles = this.esRepresentante() ? lista.filter((p) => p.representanteId === miId) : lista;
        const activos = visibles.filter((p) => p.esActivo !== false);
        this.productos.set(activos);
        this.cargando.set(false);

        let guardado: number | null = null;
        try {
          const v = localStorage.getItem(CLAVE_PRODUCTO);
          guardado = v ? Number(v) : null;
        } catch { }
        const inicial = activos.find((p) => p.id === guardado) ?? activos[0];
        if (inicial?.id != null) this.seleccionarProducto(inicial.id);
      },
      error: () => {
        this.error.set('No se pudieron cargar los productos.');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarProducto(evento: Event): void {
    this.seleccionarProducto(Number((evento.target as HTMLSelectElement).value));
  }

  private seleccionarProducto(id: number): void {
    this.productoId.set(id);
    this.aplicarRepresentanteAsignado();
    this.enlaceConsumidor.set(null);
    this.enlaceRepresentante.set(null);
    this.errorEnlace.set(null);
    this.filaExpandida.set(null);
    this.restaurarGuia();
    try {
      localStorage.setItem(CLAVE_PRODUCTO, String(id));
    } catch { }

    this.cargandoSalas.set(true);
    this.salas.set([]);
    this.salaApi.listarPorProducto(id).subscribe({
      next: (salas) => {
        // Se ignora la respuesta si mientras tanto se eligió otro producto.
        if (this.productoId() !== id) return;
        this.salas.set(salas);
        this.cargandoSalas.set(false);
      },
      error: () => {
        if (this.productoId() !== id) return;
        this.error.set('No se pudieron cargar los enlaces del producto.');
        this.cargandoSalas.set(false);
      },
    });
  }

  /**
   * Para el administrador del cliente: preselecciona el representante asignado al producto elegido
   * (o el primero de la lista si el producto no tiene uno). El representante no usa este selector.
   */
  private aplicarRepresentanteAsignado(): void {
    if (this.esRepresentante()) return;
    const reps = this.representantes();
    const asignado = this.producto()?.representanteId ?? null;
    if (asignado != null && reps.some((r) => r.id === asignado)) {
      this.representanteId.set(asignado);
    } else if (reps.length) {
      this.representanteId.set(reps[0].id);
    }
  }

  // Representante (solo administrador del cliente)
  protected cambiarRepresentante(evento: Event): void {
    this.representanteId.set(Number((evento.target as HTMLSelectElement).value));
  }

  // Guía de preguntas
  protected cambiarGuia(id: number | null): void {
    this.guiaId.set(id);
    try {
      if (id == null) localStorage.removeItem(this.claveGuia());
      else localStorage.setItem(this.claveGuia(), String(id));
    } catch { }
  }

  private restaurarGuia(): void {
    try {
      const v = localStorage.getItem(this.claveGuia());
      this.guiaId.set(v ? Number(v) : null);
    } catch {
      this.guiaId.set(null);
    }
  }

  private claveGuia(): string {
    return `vc.guia.producto.${this.productoId()}`;
  }

  // Enlaces de sala
  protected generarEnlace(): void {
    const p = this.producto();
    if (p?.id == null) return;
    const representanteId = this.esRepresentante()
      ? this.cuentaId()
      : (this.representanteId() ?? CUENTA_ID_PRUEBA);
    this.generando.set(true);
    this.errorEnlace.set(null);
    this.copiado.set(null);
    this.enlaceConsumidor.set(null);
    this.enlaceRepresentante.set(null);

    this.salaApi.crear(p.id, this.cuentaId()).subscribe({
      next: (sala) => {
        this.salas.update((lista) => [sala, ...lista]);
        this.enlaceConsumidor.set(`${urlBase()}/sala/${sala.token}`);
        // El representante necesita una entrevista para poder subir la grabación.
        this.entrevistaApi.iniciar(sala.id!, representanteId).subscribe({
          next: (entrevista) => {
            const guia = this.guiaId();
            const params = `entrevistaId=${entrevista.id}${guia != null ? `&guiaId=${guia}` : ''}`;
            this.enlaceRepresentante.set(`${urlBase()}/representante/${sala.token}?${params}`);
            this.generando.set(false);
          },
          error: (err) => {
            this.generando.set(false);
            this.errorEnlace.set(
              err?.error?.mensaje ?? 'La sala se creó, pero no se pudo crear la entrevista del representante.',
            );
          },
        });
      },
      error: (err) => {
        this.generando.set(false);
        this.errorEnlace.set(err?.error?.mensaje ?? 'No se pudo generar el enlace. Revisa tu saldo e intenta de nuevo.');
      },
    });
  }

  protected async copiar(quien: 'consumidor' | 'representante'): Promise<void> {
    const url = quien === 'consumidor' ? this.enlaceConsumidor() : this.enlaceRepresentante();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.copiado.set(quien);
      setTimeout(() => this.copiado.update((c) => (c === quien ? null : c)), 2500);
    } catch {
      this.errorEnlace.set('No se pudo copiar. Selecciona el enlace y cópialo manualmente.');
    }
  }

  // Tabla de enlaces
  protected tono(estado: string): TonoBadge {
    return estado === 'PENDIENTE' ? 'brand' : estado === 'RESPONDIDO' ? 'success' : 'neutral';
  }
  protected etiqueta(estado: string): string {
    return estado.charAt(0) + estado.slice(1).toLowerCase();
  }
  protected sufijo(token: string): string {
    return '…' + token.slice(-6).toUpperCase();
  }

  protected alternarDetalleHistorico(sala: SalaDTO): void {
    this.filaExpandida.update((actual) => (actual === sala.token ? null : sala.token));
  }

  protected urlConsumidorHistorico(sala: SalaDTO): string {
    return `${urlBase()}/sala/${sala.token}`;
  }

  protected urlRepresentanteHistorico(sala: SalaDTO): string {
    return sala.entrevistaId
      ? `${urlBase()}/representante/${sala.token}?entrevistaId=${sala.entrevistaId}`
      : `${urlBase()}/representante/${sala.token}`;
  }

  protected async copiarHistorico(sala: SalaDTO, quien: 'consumidor' | 'representante'): Promise<void> {
    const url = quien === 'consumidor' ? this.urlConsumidorHistorico(sala) : this.urlRepresentanteHistorico(sala);
    try {
      await navigator.clipboard.writeText(url);
      const idBoton = `${sala.token}-${quien}`;
      this.copiadoFila.set(idBoton);
      setTimeout(() => this.copiadoFila.update((c) => (c === idBoton ? null : c)), 2500);
    } catch {
      this.error.set('No se pudo copiar el enlace de la tabla.');
    }
  }
}