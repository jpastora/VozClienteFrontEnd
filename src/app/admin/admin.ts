import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { CuentaApi } from '../core/cuenta-api';
import { mensajeServidor } from '../core/errores';
import { EmpresaApi } from '../core/empresa-api';
import { CambioRolDTO, CuentaGlobalDTO, EmpresaDTO, RolCuentaApi } from '../core/models';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';
import { SessionService } from '../services/session';

type FiltroEstado = 'todos' | 'PENDIENTE' | 'ACTIVA' | 'INACTIVA';
type FiltroRol = 'todos' | RolCuentaApi;
type TonoBadge = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const MAX_NOMBRE = 100;
const MIN_NOMBRE = 2;
const MAX_CORREO = 254;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MetodoAcceso = 'google' | 'contrasena';

const ROLES: RolCuentaApi[] = ['ADMINISTRADOR', 'CLIENTE_ADMINISTRADOR', 'REPRESENTANTE'];

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

/** Aviso que se muestra sobre la tabla después de una acción. */
interface Aviso {
  tipo: 'ok' | 'alerta';
  texto: string;
}

/**
 * Módulo de usuarios del administrador de la plataforma (RF-02): todas las cuentas de todas las
 * empresas. Permite crear cuentas con cualquier rol (reciben una contraseña temporal por correo),
 * cambiar el rol, activar o desactivar, reenviar la contraseña temporal y ver la bitácora de roles.
 */
@Component({
  imports: [Badge, Button, DatePipe, Dialog, Field],
  selector: 'vc-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin {
  private readonly api = inject(CuentaApi);
  private readonly empresaApi = inject(EmpresaApi);
  private readonly sesion = inject(SessionService);

  protected readonly roles = ROLES;

  /** Id de la persona con sesión: no puede cambiarse el rol ni desactivarse a sí misma. */
  protected readonly miId = computed(() => this.sesion.usuario()?.id ?? null);

  // Listado
  protected readonly cuentas = signal<CuentaGlobalDTO[]>([]);
  protected readonly empresas = signal<EmpresaDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly aviso = signal<Aviso | null>(null);

  /** Empresa elegida en el menú: null es la vista global (todas las cuentas, incluidos los administradores de plataforma). */
  protected readonly empresaElegida = this.sesion.empresaId;

  // Filtros (se resuelven aquí sobre el listado)
  protected readonly busqueda = signal('');
  protected readonly filtroRol = signal<FiltroRol>('todos');
  protected readonly filtroEstado = signal<FiltroEstado>('todos');

  protected readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const rol = this.filtroRol();
    const estado = this.filtroEstado();
    return this.cuentas().filter(
      (c) =>
        (!texto || c.nombreCompleto.toLowerCase().includes(texto) || c.correo.toLowerCase().includes(texto)) &&
        (rol === 'todos' || c.rol === rol) &&
        (estado === 'todos' || c.estado === estado),
    );
  });

  // Alta
  protected readonly formAbierto = signal(false);
  protected readonly nombre = signal('');
  protected readonly correo = signal('');
  protected readonly correoRepetido = signal('');
  protected readonly rolNuevaCuenta = signal<RolCuentaApi>('CLIENTE_ADMINISTRADOR');
  protected readonly empresaNuevaCuenta = signal<number | null>(null);
  protected readonly metodoAcceso = signal<MetodoAcceso>('contrasena');
  /** Si la persona eligió el método a mano, deja de sugerirse según el correo. */
  private metodoElegidoAMano = false;
  protected readonly intento = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly errorCorreoServidor = signal<string | null>(null);

  /** El administrador de la plataforma no pertenece a ninguna empresa. */
  protected readonly altaNecesitaEmpresa = computed(() => this.rolNuevaCuenta() !== 'ADMINISTRADOR');

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
    if (this.cuentas().some((c) => c.correo.toLowerCase() === valor)) {
      return 'Ya existe una cuenta con este correo.';
    }
    return this.errorCorreoServidor();
  });

  /** El correo recibe la contraseña temporal: se pide dos veces para evitar errores de tipeo. */
  protected readonly errorCorreoRepetido = computed<string | null>(() => {
    if (!this.intento()) return null;
    return this.correo().trim().toLowerCase() === this.correoRepetido().trim().toLowerCase()
      ? null
      : 'Los correos no coinciden.';
  });

  protected readonly errorEmpresaAlta = computed<string | null>(() =>
    this.intento() && this.altaNecesitaEmpresa() && this.empresaNuevaCuenta() === null
      ? 'Selecciona la empresa de la cuenta.'
      : null,
  );

  // Cambio de rol
  protected readonly porCambiar = signal<CuentaGlobalDTO | null>(null);
  protected readonly nuevoRol = signal<RolCuentaApi | null>(null);
  protected readonly empresaCambio = signal<number | null>(null);
  protected readonly cambiando = signal(false);
  protected readonly errorCambio = signal<string | null>(null);

  /** Pasar un administrador de la plataforma a otro rol exige elegir su empresa. */
  protected readonly cambioNecesitaEmpresa = computed(
    () => this.porCambiar()?.rol === 'ADMINISTRADOR' && this.nuevoRol() !== null && this.nuevoRol() !== 'ADMINISTRADOR',
  );

  protected readonly cambioListo = computed(
    () => this.nuevoRol() !== null && (!this.cambioNecesitaEmpresa() || this.empresaCambio() !== null),
  );

  // Activar / desactivar
  protected readonly porCambiarEstado = signal<CuentaGlobalDTO | null>(null);
  protected readonly cambiandoEstado = signal(false);
  protected readonly errorEstado = signal<string | null>(null);

  // Contraseña temporal
  protected readonly reenviandoId = signal<number | null>(null);

  // Historial
  protected readonly historialDe = signal<CuentaGlobalDTO | null>(null);
  protected readonly historial = signal<CambioRolDTO[]>([]);
  protected readonly cargandoHistorial = signal(false);
  protected readonly errorHistorial = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.empresaApi.listar().subscribe({
      next: (lista) => this.empresas.set([...lista].sort((a, b) => a.nombre.localeCompare(b.nombre))),
      error: () => this.errorCarga.set('No se pudo cargar la lista de empresas.'),
    });
    this.api.listar(this.empresaElegida() ?? undefined).subscribe({
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

  private ordenar(lista: CuentaGlobalDTO[]): CuentaGlobalDTO[] {
    return [...lista].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
  }

  /** Reemplaza una cuenta en el listado con la versión que devolvió el back-end. */
  private reemplazar(actualizada: CuentaGlobalDTO): void {
    this.cuentas.update((lista) => lista.map((c) => (c.id === actualizada.id ? actualizada : c)));
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
    this.rolNuevaCuenta.set('CLIENTE_ADMINISTRADOR');
    this.metodoAcceso.set('contrasena');
    this.metodoElegidoAMano = false;
    this.empresaNuevaCuenta.set(this.empresaElegida());
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
    // Una cuenta de Gmail casi seguro ingresa con Google: se sugiere ese método (se puede cambiar).
    if (!this.metodoElegidoAMano) {
      this.metodoAcceso.set(/@(gmail|googlemail)\.com$/i.test(valor.trim()) ? 'google' : 'contrasena');
    }
  }

  protected elegirMetodo(evento: Event): void {
    this.metodoElegidoAMano = true;
    this.metodoAcceso.set((evento.target as HTMLSelectElement).value as MetodoAcceso);
  }

  protected elegirRolAlta(evento: Event): void {
    this.rolNuevaCuenta.set((evento.target as HTMLSelectElement).value as RolCuentaApi);
  }

  protected elegirEmpresaAlta(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.empresaNuevaCuenta.set(valor ? Number(valor) : null);
  }

  protected guardar(): void {
    this.intento.set(true);
    if (this.errorNombre() || this.errorCorreo() || this.errorCorreoRepetido() || this.errorEmpresaAlta()) return;

    this.guardando.set(true);
    this.errorGuardar.set(null);
    this.api
      .crear({
        nombreCompleto: this.nombre().trim(),
        correo: this.correo().trim().toLowerCase(),
        rol: this.rolNuevaCuenta(),
        empresaId: this.altaNecesitaEmpresa() ? this.empresaNuevaCuenta() : null,
        ingresaConGoogle: this.metodoAcceso() === 'google',
      })
      .subscribe({
        next: (creada) => {
          const visible = this.empresaElegida() === null || creada.empresaId === this.empresaElegida();
          if (visible) this.cuentas.update((lista) => this.ordenar([...lista, creada]));
          this.guardando.set(false);
          this.formAbierto.set(false);
          this.avisarEnvio(creada, 'Cuenta creada.');
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          if (err.status === 409) {
            this.errorCorreoServidor.set('Ya existe una cuenta registrada con este correo.');
          } else if (err.status === 400 || err.status === 404) {
            this.errorGuardar.set('Revisa los datos ingresados (rol y empresa) e intenta de nuevo.');
          } else if (err.status === 403) {
            this.errorGuardar.set('No tienes permiso para crear cuentas.');
          } else {
            this.errorGuardar.set('No se pudo crear la cuenta. Intenta de nuevo.');
          }
        },
      });
  }

  /** Cuenta al administrador si el correo con la contraseña temporal salió o no. */
  private avisarEnvio(cuenta: CuentaGlobalDTO, inicio: string): void {
    if (cuenta.correoEnviado === null) {
      this.aviso.set({
        tipo: 'ok',
        texto: `${inicio} No se envió correo: ${cuenta.correo} debe ingresar con el botón de Google.`,
      });
      return;
    }
    this.aviso.set(
      cuenta.correoEnviado
        ? { tipo: 'ok', texto: `${inicio} Se envió la contraseña temporal a ${cuenta.correo}.` }
        : {
            tipo: 'alerta',
            texto: `${inicio} No se pudo enviar el correo a ${cuenta.correo}. Usa «Reenviar contraseña» cuando el correo esté disponible.`,
          },
    );
  }

  // --- Cambio de rol ---

  protected pedirCambio(cuenta: CuentaGlobalDTO): void {
    this.errorCambio.set(null);
    this.nuevoRol.set(null);
    this.empresaCambio.set(null);
    this.porCambiar.set(cuenta);
  }

  protected cancelarCambio(): void {
    if (!this.cambiando()) this.porCambiar.set(null);
  }

  protected elegirRol(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.nuevoRol.set(valor ? (valor as RolCuentaApi) : null);
  }

  protected elegirEmpresaCambio(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.empresaCambio.set(valor ? Number(valor) : null);
  }

  /** Roles a los que se puede pasar: todos menos el actual. */
  protected rolesDisponibles(cuenta: CuentaGlobalDTO): RolCuentaApi[] {
    return ROLES.filter((r) => r !== cuenta.rol);
  }

  protected confirmarCambio(): void {
    const cuenta = this.porCambiar();
    const rol = this.nuevoRol();
    if (!cuenta || !rol || !this.cambioListo()) return;

    this.cambiando.set(true);
    this.errorCambio.set(null);
    this.api
      .cambiarRol(cuenta.id, {
        nuevoRol: rol,
        version: cuenta.version,
        empresaId: this.cambioNecesitaEmpresa() ? this.empresaCambio() : null,
      })
      .subscribe({
        next: (actualizada) => {
          this.reemplazar(actualizada);
          this.cambiando.set(false);
          this.porCambiar.set(null);
          this.aviso.set({ tipo: 'ok', texto: `Rol de ${actualizada.nombreCompleto} actualizado.` });
        },
        error: (err: HttpErrorResponse) => {
          this.cambiando.set(false);
          if (err.status === 409) {
            this.errorCambio.set(`${mensajeServidor(err) ?? 'No se pudo aplicar el cambio'}. Se actualizó la lista.`);
            this.cargar();
          } else if (err.status === 400) {
            this.errorCambio.set(mensajeServidor(err) ?? 'La cuenta ya tiene ese rol o falta elegir la empresa.');
          } else if (err.status === 404) {
            this.errorCambio.set('La cuenta o la empresa ya no están disponibles.');
            this.cargar();
          } else {
            this.errorCambio.set('No se pudo cambiar el rol. Intenta de nuevo.');
          }
        },
      });
  }

  // --- Activar / desactivar ---

  protected pedirCambioEstado(cuenta: CuentaGlobalDTO): void {
    this.errorEstado.set(null);
    this.porCambiarEstado.set(cuenta);
  }

  protected cancelarCambioEstado(): void {
    if (!this.cambiandoEstado()) this.porCambiarEstado.set(null);
  }

  protected confirmarCambioEstado(): void {
    const cuenta = this.porCambiarEstado();
    if (!cuenta) return;
    const activar = cuenta.estado === 'INACTIVA';

    this.cambiandoEstado.set(true);
    this.errorEstado.set(null);
    this.api.cambiarEstado(cuenta.id, { activa: activar, version: cuenta.version }).subscribe({
      next: (actualizada) => {
        this.reemplazar(actualizada);
        this.cambiandoEstado.set(false);
        this.porCambiarEstado.set(null);
        this.aviso.set({
          tipo: 'ok',
          texto: `${actualizada.nombreCompleto}: cuenta ${activar ? 'reactivada' : 'desactivada'}.`,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.cambiandoEstado.set(false);
        if (err.status === 409) {
          this.errorEstado.set(`${mensajeServidor(err) ?? 'No se pudo aplicar el cambio'}. Se actualizó la lista.`);
          this.cargar();
        } else {
          this.errorEstado.set('No se pudo cambiar el estado. Intenta de nuevo.');
        }
      },
    });
  }

  // --- Contraseña temporal ---

  protected reenviarContrasena(cuenta: CuentaGlobalDTO): void {
    this.reenviandoId.set(cuenta.id);
    this.aviso.set(null);
    this.api.reenviarContrasena(cuenta.id).subscribe({
      next: (actualizada) => {
        this.reemplazar(actualizada);
        this.reenviandoId.set(null);
        this.avisarEnvio(actualizada, 'Contraseña temporal nueva generada.');
      },
      error: (err: HttpErrorResponse) => {
        this.reenviandoId.set(null);
        this.aviso.set({
          tipo: 'alerta',
          texto:
            err.status === 409
              ? (mensajeServidor(err) ?? 'No se pudo reenviar la contraseña temporal.')
              : 'No se pudo reenviar la contraseña temporal. Intenta de nuevo.',
        });
      },
    });
  }

  // --- Historial ---

  protected verHistorial(cuenta: CuentaGlobalDTO): void {
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
