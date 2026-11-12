import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { CuentaApi } from '../core/cuenta-api';
import { CambioRolDTO, CuentaDTO } from '../core/models';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';
import { RolInfo } from '../interfaces/usuario';
import { SessionService } from '../services/session';

type FiltroEstado = 'todos' | 'PENDIENTE' | 'ACTIVA' | 'INACTIVA';
type FiltroRol = 'todos' | RolInfo;
type TonoBadge = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const MAX_NOMBRE = 100;
const MIN_NOMBRE = 2;
const MAX_CORREO = 254;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES: RolInfo[] = ['ADMINISTRADOR', 'CLIENTE_ADMINISTRADOR', 'REPRESENTANTE'];

const ETIQUETAS_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador de la plataforma',
  CLIENTE_ADMINISTRADOR: 'Cliente-administrador',
  REPRESENTANTE: 'Representante',
};

const ETIQUETAS_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
};

/**
 * Administración de usuarios para el administrador de la plataforma (RF-02): listado, alta de
 * cliente-administrador, cambio de rol y bitácora de cambios de rol.
 *
 * El back-end limita el listado al ámbito de quien tiene la sesión; esta pantalla muestra lo que
 * ese endpoint devuelve y no filtra por empresa.
 */
@Component({
  imports: [Badge, Button, DatePipe, Dialog, Field],
  selector: 'vc-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin {
  private readonly api = inject(CuentaApi);
  private readonly sesion = inject(SessionService);

  protected readonly roles = ROLES;

  /** Id de la persona con sesión: no puede cambiarse el rol a sí misma. */
  protected readonly miId = computed(() => this.sesion.usuario()?.id ?? null);

  // Listado
  protected readonly cuentas = signal<CuentaDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  // Filtros (el back-end no los soporta, se resuelven aquí)
  protected readonly busqueda = signal('');
  protected readonly filtroRol = signal<FiltroRol>('todos');
  protected readonly filtroEstado = signal<FiltroEstado>('todos');

  protected readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const rol = this.filtroRol();
    const estado = this.filtroEstado();
    return this.cuentas().filter(
      (c) =>
        (!texto || c.nombreCompleto.toLowerCase().includes(texto) || (c.correo ?? '').toLowerCase().includes(texto)) &&
        (rol === 'todos' || c.rol === rol) &&
        (estado === 'todos' || c.estado === estado),
    );
  });

  // Alta
  protected readonly formAbierto = signal(false);
  protected readonly nombre = signal('');
  protected readonly correo = signal('');
  protected readonly correoRepetido = signal('');
  protected readonly intento = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly errorCorreoServidor = signal<string | null>(null);

  protected readonly errorNombre = computed<string | null>(() => {
    if (!this.intento()) return null;
    const valor = this.nombre().trim();
    if (!valor) return 'El nombre completo es obligatorio.';
    if (valor.length < MIN_NOMBRE) return `Mínimo ${MIN_NOMBRE} caracteres.`;
    if (valor.length > MAX_NOMBRE) return `Máximo ${MAX_NOMBRE} caracteres.`;
    return null;
  });

  protected readonly errorCorreo = computed<string | null>(() => {
    if (!this.intento()) return null;
    const valor = this.correo().trim().toLowerCase();
    if (!valor) return 'El correo es obligatorio.';
    if (valor.length > MAX_CORREO) return `Máximo ${MAX_CORREO} caracteres.`;
    if (!PATRON_CORREO.test(valor)) return 'El formato del correo no es válido.';
    if (this.cuentas().some((c) => (c.correo ?? '').toLowerCase() === valor)) {
      return 'Ya existe una cuenta con este correo.';
    }
    return this.errorCorreoServidor();
  });

  /** El correo define quién queda con la cuenta al ingresar con Google: se pide dos veces. */
  protected readonly errorCorreoRepetido = computed<string | null>(() => {
    if (!this.intento()) return null;
    return this.correo().trim().toLowerCase() === this.correoRepetido().trim().toLowerCase()
      ? null
      : 'Los correos no coinciden.';
  });

  // Cambio de rol
  protected readonly porCambiar = signal<CuentaDTO | null>(null);
  protected readonly nuevoRol = signal<RolInfo | null>(null);
  protected readonly cambiando = signal(false);
  protected readonly errorCambio = signal<string | null>(null);

  // Historial
  protected readonly historialDe = signal<CuentaDTO | null>(null);
  protected readonly historial = signal<CambioRolDTO[]>([]);
  protected readonly cargandoHistorial = signal(false);
  protected readonly errorHistorial = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api.listar().subscribe({
      next: (lista) => {
        this.cuentas.set(this.ordenar(lista));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar la lista de usuarios.');
        this.cargando.set(false);
      },
    });
  }

  private ordenar(lista: CuentaDTO[]): CuentaDTO[] {
    return [...lista].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  protected cambiarFiltroRol(evento: Event): void {
    this.filtroRol.set((evento.target as HTMLSelectElement).value as FiltroRol);
  }

  protected cambiarFiltroEstado(evento: Event): void {
    this.filtroEstado.set((evento.target as HTMLSelectElement).value as FiltroEstado);
  }

  // --- Alta ---

  protected abrirNuevo(): void {
    this.nombre.set('');
    this.correo.set('');
    this.correoRepetido.set('');
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
    if (this.errorNombre() || this.errorCorreo() || this.errorCorreoRepetido()) return;

    this.guardando.set(true);
    this.errorGuardar.set(null);
    this.api.crear({ nombreCompleto: this.nombre().trim(), correo: this.correo().trim().toLowerCase() }).subscribe({
      next: (creada) => {
        this.cuentas.update((lista) => this.ordenar([...lista, creada]));
        this.guardando.set(false);
        this.formAbierto.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 409) {
          this.errorCorreoServidor.set('Ya existe una cuenta registrada con este correo.');
        } else if (err.status === 400) {
          this.errorGuardar.set('Revisa los datos ingresados e intenta de nuevo.');
        } else if (err.status === 403) {
          this.errorGuardar.set('No tienes permiso para crear cuentas.');
        } else {
          this.errorGuardar.set('No se pudo crear la cuenta. Intenta de nuevo.');
        }
      },
    });
  }

  // --- Cambio de rol ---

  protected pedirCambio(cuenta: CuentaDTO): void {
    this.errorCambio.set(null);
    this.nuevoRol.set(null);
    this.porCambiar.set(cuenta);
  }

  protected cancelarCambio(): void {
    if (!this.cambiando()) this.porCambiar.set(null);
  }

  protected elegirRol(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.nuevoRol.set(valor ? (valor as RolInfo) : null);
  }

  /** Roles a los que se puede pasar: todos menos el actual. */
  protected rolesDisponibles(cuenta: CuentaDTO): RolInfo[] {
    return ROLES.filter((r) => r !== cuenta.rol);
  }

  protected confirmarCambio(): void {
    const cuenta = this.porCambiar();
    const rol = this.nuevoRol();
    if (!cuenta || !rol) return;
    if (cuenta.version == null) {
      this.errorCambio.set('La cuenta no trae versión. Actualiza la lista e intenta de nuevo.');
      return;
    }

    this.cambiando.set(true);
    this.errorCambio.set(null);
    this.api.cambiarRol(cuenta.id, { nuevoRol: rol, version: cuenta.version }).subscribe({
      next: (actualizada) => {
        this.cuentas.update((lista) => lista.map((c) => (c.id === actualizada.id ? actualizada : c)));
        this.cambiando.set(false);
        this.porCambiar.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.cambiando.set(false);
        if (err.status === 409) {
          this.errorCambio.set(
            'No se pudo aplicar: la cuenta cambió mientras la editabas o es el último administrador activo. Se actualizó la lista.',
          );
          this.cargar();
        } else if (err.status === 400) {
          this.errorCambio.set('La cuenta ya tiene ese rol.');
        } else if (err.status === 404) {
          this.errorCambio.set('La cuenta ya no está disponible.');
          this.cargar();
        } else {
          this.errorCambio.set('No se pudo cambiar el rol. Intenta de nuevo.');
        }
      },
    });
  }

  // --- Historial ---

  protected verHistorial(cuenta: CuentaDTO): void {
    this.historialDe.set(cuenta);
    this.historial.set([]);
    this.errorHistorial.set(null);
    this.cargandoHistorial.set(true);
    this.api.historial(cuenta.id).subscribe({
      next: (lista) => {
        this.historial.set(lista);
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.errorHistorial.set('No se pudo cargar el historial.');
        this.cargandoHistorial.set(false);
      },
    });
  }

  protected cerrarHistorial(): void {
    this.historialDe.set(null);
  }

  /** Nombre de quien hizo el cambio, si está en la lista; si no, su identificador. */
  protected autor(autorId: number): string {
    return this.cuentas().find((c) => c.id === autorId)?.nombreCompleto ?? `Cuenta #${autorId}`;
  }

  // --- Presentación ---

  protected etiquetaRol(rol?: string): string {
    return (rol && ETIQUETAS_ROL[rol]) || rol || '—';
  }

  protected etiquetaEstado(estado?: string): string {
    return (estado && ETIQUETAS_ESTADO[estado]) || '—';
  }

  protected tonoEstado(estado?: string): TonoBadge {
    return estado === 'ACTIVA' ? 'success' : estado === 'PENDIENTE' ? 'brand' : 'neutral';
  }

  protected tonoRol(rol?: string): TonoBadge {
    return rol === 'ADMINISTRADOR' ? 'warning' : 'neutral';
  }
}
