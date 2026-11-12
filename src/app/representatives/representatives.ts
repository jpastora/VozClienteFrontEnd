import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { errorContrasena, errorNombre, normalizarNombre, REGLA_CONTRASENA } from '../core/contrasena';
import { CuentaDTO } from '../core/models';
import { RepresentanteApi } from '../core/representante-api';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';

type FiltroEstado = 'todos' | 'PENDIENTE' | 'ACTIVA' | 'INACTIVA';
type TonoBadge = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const MAX_CORREO = 254;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ETIQUETAS_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
};

/** Alta, listado y desactivación de representantes de la empresa (RF-03, prototipo "Representantes"). */
@Component({
  imports: [Badge, Button, DatePipe, Dialog, Field],
  selector: 'vc-representatives',
  styleUrl: './representatives.css',
  templateUrl: './representatives.html',
})
export class Representatives {
  private readonly api = inject(RepresentanteApi);

  // Listado
  protected readonly representantes = signal<CuentaDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  // Filtros (el back-end no los soporta, se resuelven aquí)
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<FiltroEstado>('todos');

  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();
    return this.representantes().filter(
      (r) =>
        (!texto || r.nombreCompleto.toLowerCase().includes(texto) || (r.correo ?? '').toLowerCase().includes(texto)) &&
        (estado === 'todos' || r.estado === estado),
    );
  });

  // Alta
  protected readonly formAbierto = signal(false);
  protected readonly nombre = signal('');
  protected readonly correo = signal('');
  /** Opcional: contraseña inicial para que el representante ingrese sin Google. */
  protected readonly contrasenaInicial = signal('');
  protected readonly intento = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly errorCorreoServidor = signal<string | null>(null);

  protected readonly errorNombre = computed<string | null>(() => {
    if (!this.intento()) return null;
    return errorNombre(this.nombre());
  });

  protected readonly errorCorreo = computed<string | null>(() => {
    if (!this.intento()) return null;
    const valor = this.correo().trim().toLowerCase();
    if (!valor) return 'El correo es obligatorio.';
    if (valor.length > MAX_CORREO) return `Máximo ${MAX_CORREO} caracteres.`;
    if (!PATRON_CORREO.test(valor)) return 'El formato del correo no es válido.';
    if (this.representantes().some((r) => (r.correo ?? '').toLowerCase() === valor)) {
      return 'Ya existe un representante con este correo.';
    }
    return this.errorCorreoServidor();
  });

  protected readonly errorContrasenaInicial = computed<string | null>(() => {
    if (!this.intento() || !this.contrasenaInicial()) return null;
    return errorContrasena(this.contrasenaInicial());
  });

  // Contraseña de un representante existente
  protected readonly reglaContrasena = REGLA_CONTRASENA;
  protected readonly porContrasena = signal<CuentaDTO | null>(null);
  protected readonly nuevaContrasena = signal('');
  protected readonly intentoContrasena = signal(false);
  protected readonly guardandoContrasena = signal(false);
  protected readonly errorGuardarContrasena = signal<string | null>(null);
  protected readonly contrasenaAsignada = signal<string | null>(null);

  protected readonly errorNuevaContrasena = computed<string | null>(() =>
    this.intentoContrasena() ? errorContrasena(this.nuevaContrasena()) : null,
  );

  // Desactivación
  protected readonly porDesactivar = signal<CuentaDTO | null>(null);
  protected readonly desactivando = signal(false);
  protected readonly errorDesactivar = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api.listar().subscribe({
      next: (lista) => {
        this.representantes.set([...lista].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar la lista de representantes.');
        this.cargando.set(false);
      },
    });
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  protected cambiarEstado(evento: Event): void {
    this.filtroEstado.set((evento.target as HTMLSelectElement).value as FiltroEstado);
  }

  // --- Alta ---

  protected abrirNuevo(): void {
    this.nombre.set('');
    this.correo.set('');
    this.contrasenaInicial.set('');
    this.intento.set(false);
    this.errorGuardar.set(null);
    this.errorCorreoServidor.set(null);
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    if (!this.guardando()) this.formAbierto.set(false);
  }

  protected cambiarCorreo(valor: string): void {
    this.correo.set(valor);
    this.errorCorreoServidor.set(null);
  }

  protected guardar(): void {
    this.intento.set(true);
    if (this.errorNombre() || this.errorCorreo() || this.errorContrasenaInicial()) return;

    this.guardando.set(true);
    this.errorGuardar.set(null);
    const contrasena = this.contrasenaInicial();
    this.api
      .crear({
        nombreCompleto: normalizarNombre(this.nombre()),
        correo: this.correo().trim().toLowerCase(),
        ...(contrasena ? { contrasena } : {}),
      })
      .subscribe({
      next: (creado) => {
        this.representantes.update((lista) =>
          [...lista, creado].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
        );
        this.guardando.set(false);
        this.formAbierto.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 409) {
          this.errorCorreoServidor.set('Ya existe una cuenta registrada con este correo.');
        } else if (err.status === 400) {
          this.errorGuardar.set('Revisa los datos ingresados e intenta de nuevo.');
        } else {
          this.errorGuardar.set(err?.error?.mensaje ?? 'No se pudo registrar al representante. Intenta de nuevo.');
        }
      },
    });
  }

  // --- Contraseña ---

  protected pedirContrasena(representante: CuentaDTO): void {
    this.nuevaContrasena.set('');
    this.intentoContrasena.set(false);
    this.errorGuardarContrasena.set(null);
    this.contrasenaAsignada.set(null);
    this.porContrasena.set(representante);
  }

  protected cerrarContrasena(): void {
    if (!this.guardandoContrasena()) this.porContrasena.set(null);
  }

  protected guardarContrasena(): void {
    const representante = this.porContrasena();
    this.intentoContrasena.set(true);
    if (!representante || this.errorNuevaContrasena()) return;

    this.guardandoContrasena.set(true);
    this.errorGuardarContrasena.set(null);
    this.api.asignarContrasena(representante.id, this.nuevaContrasena()).subscribe({
      next: () => {
        this.guardandoContrasena.set(false);
        this.contrasenaAsignada.set(representante.nombreCompleto);
        this.nuevaContrasena.set('');
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoContrasena.set(false);
        this.errorGuardarContrasena.set(
          err.status === 400
            ? 'La contraseña no cumple las reglas.'
            : 'No se pudo asignar la contraseña. Intenta de nuevo.',
        );
      },
    });
  }

  // --- Desactivación ---

  protected pedirDesactivar(representante: CuentaDTO): void {
    this.errorDesactivar.set(null);
    this.porDesactivar.set(representante);
  }

  protected cancelarDesactivar(): void {
    if (!this.desactivando()) this.porDesactivar.set(null);
  }

  protected confirmarDesactivar(): void {
    const representante = this.porDesactivar();
    if (!representante) return;
    this.desactivando.set(true);
    this.errorDesactivar.set(null);
    this.api.desactivar(representante.id).subscribe({
      next: (actualizado) => {
        this.representantes.update((lista) => lista.map((r) => (r.id === actualizado.id ? actualizado : r)));
        this.desactivando.set(false);
        this.porDesactivar.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.desactivando.set(false);
        this.errorDesactivar.set(
          err.status === 409 ? 'El representante ya estaba desactivado.' : 'No se pudo desactivar al representante.',
        );
        if (err.status === 409) this.cargar();
      },
    });
  }

  protected tono(estado?: string): TonoBadge {
    return estado === 'ACTIVA' ? 'success' : estado === 'PENDIENTE' ? 'brand' : 'neutral';
  }

  protected etiqueta(estado?: string): string {
    return (estado && ETIQUETAS_ESTADO[estado]) || '—';
  }
}
