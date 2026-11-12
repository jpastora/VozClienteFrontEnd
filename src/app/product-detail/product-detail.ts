import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { CUENTA_ID_PRUEBA, urlBase } from '../core/config';
import { EntrevistaApi } from '../core/entrevista-api';
import { CuentaDTO, ProductoDTO, SalaDTO } from '../core/models';
import { ProductoApi } from '../core/producto-api';
import { RepresentanteApi } from '../core/representante-api';
import { RUTAS } from '../core/rutas';
import { SalaApi } from '../core/sala-api';
import { Dialog } from '../dialog/dialog';
import { GuiaPreguntas } from '../guia-preguntas/guia-preguntas';
import { ProductForm } from '../product-form/product-form';
import { SessionService } from '../services/session';


type TonoBadge = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

/** Estado que se muestra: una sala pendiente cuya fecha de vencimiento ya pasó cuenta como expirada. */
function estadoVigente(sala: SalaDTO): string {
  if (sala.estado === 'PENDIENTE' && sala.venceEn && new Date(sala.venceEn).getTime() < Date.now()) return 'EXPIRADO';
  return sala.estado;
}

@Component({
  imports: [Badge, Button, DatePipe, Dialog, GuiaPreguntas, ProductForm, RouterLink],
  selector: 'vc-product-detail',
  styleUrl: './product-detail.css',
  templateUrl: './product-detail.html',
})
export class ProductDetail {
  private readonly productoApi = inject(ProductoApi);
  private readonly salaApi = inject(SalaApi);
  private readonly representanteApi = inject(RepresentanteApi);
  private readonly entrevistaApi = inject(EntrevistaApi);
  private readonly sesion = inject(SessionService);

  /** Parámetro :id de la ruta (llega por withComponentInputBinding en app.config). */
  readonly id = input.required<string>();

  /** Rutas absolutas para los enlaces de la plantilla. */
  protected readonly rutas = RUTAS;

  private readonly cuentaId = computed(() => this.sesion.usuario()?.id ?? CUENTA_ID_PRUEBA);

  protected readonly sesionEmpresaId = computed(() => this.sesion.usuario()?.empresaId ?? null);

  protected readonly producto = signal<ProductoDTO | null>(null);
  protected readonly catalogo = signal<ProductoDTO[]>([]);
  protected readonly salas = signal<SalaDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly formAbierto = signal(false);
  protected readonly confirmarInactivar = signal(false);
  protected readonly cambiandoEstado = signal(false);
  protected readonly errorEstado = signal<string | null>(null);

  protected readonly generando = signal(false);
  protected readonly errorEnlace = signal<string | null>(null);
  protected readonly enlaceConsumidor = signal<string | null>(null);
  protected readonly enlaceRepresentante = signal<string | null>(null);
  protected readonly copiado = signal<'consumidor' | 'representante' | null>(null);

  protected readonly copiadoFila = signal<string | null>(null);
  protected readonly filaExpandida = signal<string | null>(null);

  /** Representantes de la empresa; el elegido atenderá la entrevista. */
  protected readonly representantes = signal<CuentaDTO[]>([]);
  protected readonly representanteId = signal<number | null>(null);

  /** Guía de preguntas elegida para el representante (null = sin guía). */
  protected readonly guiaId = signal<number | null>(null);

  protected readonly filas = computed(() =>
    [...this.salas()]
      .sort((a, b) => (b.emitidaEn ?? '').localeCompare(a.emitidaEn ?? ''))
      .map((s) => ({ ...s, vigente: estadoVigente(s) })),
  );

  constructor() {
    // Recarga cuando cambia el :id de la ruta.
    effect(() => {
      this.id();
      untracked(() => this.cargar());
    });
  }

  protected cargar(): void {
    const id = Number(this.id());
    this.restaurarGuia();
    this.cargando.set(true);
    this.error.set(null);
    this.representanteApi.listar().subscribe({
      next: (cuentas) => {
        const reps = cuentas.filter((c) => c.rol === 'REPRESENTANTE' && c.estado !== 'INACTIVA');
        this.representantes.set(reps);

        // 1) Intentar restaurar el representante guardado.
        let guardado: number | null = null;
        try {
          const v = localStorage.getItem(this.claveRepresentante());
          guardado = v ? Number(v) : null;
        } catch { }

        if (guardado != null && reps.some((r) => r.id === guardado)) {
          this.representanteId.set(guardado);
        } else if (this.representanteId() === null && reps.length) {
          // 2) Si no hay guardado (o ya no existe/está inactivo), usar el primero.
          this.representanteId.set(reps[0].id);
        }
      },
      // Sin lista de cuentas se usa la cuenta de prueba como representante.
      error: () => this.representantes.set([]),
    });
  
    this.productoApi.obtener(id).subscribe({
      next: (producto) => {
        this.producto.set(producto);

        // Cargar las salas asociadas al producto.
        this.salaApi.listarPorProducto(id).subscribe({
          next: (salas) => {
            this.salas.set(salas);
            this.cargando.set(false);
          },
          error: () => {
            this.error.set(
              'No se pudieron cargar los enlaces del producto.'
            );
            this.cargando.set(false);
          }
        });

        // Catálogo auxiliar para sugerir categorías.
        this.productoApi.listar().subscribe({
          next: (lista) => this.catalogo.set(lista),
          error: () => this.catalogo.set([])
        });
      },

      error: (err) => {
        this.error.set(
          err.status === 404
            ? 'No se encontró el producto solicitado.'
            : 'No se pudo cargar el producto.'
        );

        this.cargando.set(false);
      }
    });

  }

  // Estado del producto
  protected alGuardar(guardado: ProductoDTO): void {
    this.producto.update((p) => ({ ...p, ...guardado }));
    this.catalogo.update((lista) => lista.map((p) => (p.id === guardado.id ? { ...p, ...guardado } : p)));
    this.formAbierto.set(false);
  }

  protected inactivar(): void {
    const p = this.producto();
    if (p?.id == null) return;
    this.cambiandoEstado.set(true);
    this.errorEstado.set(null);
    this.productoApi.desactivar(p.id).subscribe({
      next: () => {
        this.producto.update((x) => (x ? { ...x, esActivo: false } : x));
        this.cambiandoEstado.set(false);
        this.confirmarInactivar.set(false);
      },
      error: () => {
        this.cambiandoEstado.set(false);
        this.errorEstado.set('No se pudo inactivar el producto.');
      },
    });
  }

  protected activar(): void {
    const p = this.producto();
    if (p?.id == null) return;
    this.cambiandoEstado.set(true);
    this.errorEstado.set(null);
    // No hay endpoint "activar": se reutiliza PUT con esActivo=true (reenvía los demás campos tal cual).
    this.productoApi.actualizar(p.id, {
      nombre: p.nombre,
      descripcion: p.descripcion,
      categoria: p.categoria,
      esActivo: true,
    }).subscribe({
      next: (g) => {
        this.producto.update((x) => ({ ...x, ...g }));
        this.cambiandoEstado.set(false);
      },
      error: () => {
        this.cambiandoEstado.set(false);
        this.errorEstado.set('No se pudo activar el producto.');
      },
    });
  }

  // Enlaces de sala
  protected cambiarRepresentante(evento: Event): void {
    const id = Number((evento.target as HTMLSelectElement).value);
    this.representanteId.set(id);
    try {
      localStorage.setItem(this.claveRepresentante(), String(id));
    } catch { }
  }

  private claveRepresentante(): string {
    return `vc.representante.producto.${this.id()}`;
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
    } catch { }
  }

  private claveGuia(): string {
    return `vc.guia.producto.${this.id()}`;
  }


  

  protected generarEnlace(): void {
    const p = this.producto();
    if (p?.id == null) return;
    const representanteId = this.representanteId() ?? CUENTA_ID_PRUEBA;
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
            // La guía elegida viaja en el enlace para que el representante la vea durante la llamada.
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

  protected tono(estado: string): TonoBadge {
    return estado === 'PENDIENTE' ? 'brand' : estado === 'RESPONDIDO' ? 'success' : 'neutral';
  }
  protected etiqueta(estado: string): string {
    return estado.charAt(0) + estado.slice(1).toLowerCase();
  }
  protected sufijo(token: string): string {
    return '…' + token.slice(-6).toUpperCase();
  }

  // Método para abrir/cerrar el detalle del enlace
  protected alternarDetalleHistorico(sala: SalaDTO): void {
    if (this.filaExpandida() === sala.token) {
      this.filaExpandida.set(null); // Lo cierra si ya está abierto
    } else {
      this.filaExpandida.set(sala.token); // Lo abre
    }
  }

  // Genera la URL del consumidor para la tabla
  protected urlConsumidorHistorico(sala: SalaDTO): string {
    return `${urlBase()}/sala/${sala.token}`;
  }

  // Genera la URL del representante para la tabla
  protected urlRepresentanteHistorico(sala: SalaDTO): string {
    const idEntrevista = (sala as any).entrevistaId; 
    return idEntrevista 
      ? `${urlBase()}/representante/${sala.token}?entrevistaId=${idEntrevista}`
      : `${urlBase()}/representante/${sala.token}`;
  }


  protected async copiarHistorico(sala: SalaDTO, quien: 'consumidor' | 'representante'): Promise<void> {
    const url = quien === 'consumidor' 
      ? this.urlConsumidorHistorico(sala) 
      : this.urlRepresentanteHistorico(sala);

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