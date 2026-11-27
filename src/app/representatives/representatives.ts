import { SessionService } from '../services/session';
import { ConfirmarEliminar } from '../shared/confirmar-eliminar/confirmar-eliminar';
import { mensajeServidor } from '../core/errores';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { ActualizarRepresentanteRequest, CuentaDTO } from '../core/models';
import { RepresentanteApi } from '../core/representante-api';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';

type FiltroEstado = 'todos' | 'PENDIENTE' | 'ACTIVA' | 'INACTIVA';
type TonoBadge = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const MAX_NOMBRE = 100;
const MIN_NOMBRE = 2;
const MAX_CORREO = 254;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ETIQUETAS_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
};

/** Alta, listado y desactivación de representantes de la empresa (RF-03, prototipo "Representantes"). */
@Component({
  imports: [Badge, Button, DatePipe, Dialog, Field, ConfirmarEliminar],
  selector: 'vc-representatives',
  styleUrl: './representatives.css',
  templateUrl: './representatives.html',
})
export class Representatives {
  private readonly api = inject(RepresentanteApi);
  private readonly sesion = inject(SessionService);

  /** Solo el administrador de la plataforma elimina; los demás roles desactivan. */
  protected readonly puedeEliminar = computed(() => this.sesion.usuario()?.rol === 'ADMINISTRADOR');

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
  protected readonly metodoAcceso = signal<'google' | 'contrasena'>('contrasena');
  private metodoElegidoAMano = false;
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
    if (this.representantes().some((r) => (r.correo ?? '').toLowerCase() === valor)) {
      return 'Ya existe un representante con este correo.';
    }
    return this.errorCorreoServidor();
  });

  // Edición (nombre y correo)
  protected readonly porEditar = signal<CuentaDTO | null>(null);
  protected readonly nombreEdit = signal('');
  protected readonly correoEdit = signal('');
  protected readonly intentoEdit = signal(false);
  protected readonly guardandoEdit = signal(false);
  protected readonly errorEditar = signal<string | null>(null);
  protected readonly errorCorreoEditServidor = signal<string | null>(null);

  protected readonly errorNombreEdit = computed<string | null>(() => {
    if (!this.intentoEdit()) return null;
    const valor = this.nombreEdit().trim();
    if (!valor) return 'El nombre completo es obligatorio.';
    if (valor.length < MIN_NOMBRE) return `Mínimo ${MIN_NOMBRE} caracteres.`;
    if (valor.length > MAX_NOMBRE) return `Máximo ${MAX_NOMBRE} caracteres.`;
    return null;
  });

  protected readonly errorCorreoEdit = computed<string | null>(() => {
    if (!this.intentoEdit()) return null;
    const valor = this.correoEdit().trim().toLowerCase();
    if (!valor) return 'El correo es obligatorio.';
    if (valor.length > MAX_CORREO) return `Máximo ${MAX_CORREO} caracteres.`;
    if (!PATRON_CORREO.test(valor)) return 'El formato del correo no es válido.';
    const id = this.porEditar()?.id;
    if (this.representantes().some((r) => r.id !== id && (r.correo ?? '').toLowerCase() === valor)) {
      return 'Ya existe un representante con este correo.';
    }
    return this.errorCorreoEditServidor();
  });

  /** Verdadero si el correo escrito es distinto al actual (cambiarlo desvincula la cuenta de Google). */
  protected readonly correoCambio = computed(() => {
    const actual = (this.porEditar()?.correo ?? '').trim().toLowerCase();
    const nuevo = this.correoEdit().trim().toLowerCase();
    return nuevo !== '' && nuevo !== actual;
  });

  // Desactivación
  // Contraseña temporal y aviso del último envío
  protected readonly aviso = signal<{ tipo: 'ok' | 'alerta'; texto: string } | null>(null);
  protected readonly reenviandoId = signal<number | null>(null);

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
    this.metodoAcceso.set('contrasena');
    this.metodoElegidoAMano = false;
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
    if (!this.metodoElegidoAMano) {
      this.metodoAcceso.set(/@(gmail|googlemail)\.com$/i.test(valor.trim()) ? 'google' : 'contrasena');
    }
  }

  protected elegirMetodo(evento: Event): void {
    this.metodoElegidoAMano = true;
    this.metodoAcceso.set((evento.target as HTMLSelectElement).value as 'google' | 'contrasena');
  }

  protected guardar(): void {
    this.intento.set(true);
    if (this.errorNombre() || this.errorCorreo()) return;

    this.guardando.set(true);
    this.errorGuardar.set(null);
    this.api
      .crear({
        nombreCompleto: this.nombre().trim(),
        correo: this.correo().trim().toLowerCase(),
        ingresaConGoogle: this.metodoAcceso() === 'google',
      }).subscribe({
      next: (creado) => {
        this.representantes.update((lista) =>
          [...lista, creado].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
        );
        this.guardando.set(false);
        this.formAbierto.set(false);
        this.avisarEnvio(creado, 'Representante creado.');
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

  // --- Edición ---

  protected abrirEditar(representante: CuentaDTO): void {
    this.nombreEdit.set(representante.nombreCompleto);
    this.correoEdit.set(representante.correo ?? '');
    this.intentoEdit.set(false);
    this.errorEditar.set(null);
    this.errorCorreoEditServidor.set(null);
    this.porEditar.set(representante);
  }

  protected cerrarEditar(): void {
    if (!this.guardandoEdit()) this.porEditar.set(null);
  }

  protected cambiarCorreoEdit(valor: string): void {
    this.correoEdit.set(valor);
    this.errorCorreoEditServidor.set(null);
  }

  protected guardarEdicion(): void {
    const representante = this.porEditar();
    if (!representante || this.guardandoEdit()) return;

    this.intentoEdit.set(true);
    if (this.errorNombreEdit() || this.errorCorreoEdit()) return;

    // Solo se envía lo que cambió.
    const nombre = this.nombreEdit().trim();
    const correo = this.correoEdit().trim().toLowerCase();
    if (representante.version === undefined) {
      this.errorEditar.set('No se pudo determinar la versión de la cuenta. Actualiza la lista e intenta de nuevo.');
      return;
    }
    const cambios: ActualizarRepresentanteRequest = { version: representante.version };
    if (nombre !== representante.nombreCompleto) cambios.nombreCompleto = nombre;
    if (correo !== (representante.correo ?? '').toLowerCase()) cambios.correo = correo;

    if (cambios.nombreCompleto === undefined && cambios.correo === undefined) {
      this.porEditar.set(null);
      return;
    }

    this.guardandoEdit.set(true);
    this.errorEditar.set(null);
    this.api.actualizar(representante.id, cambios).subscribe({
      next: (actualizado) => {
        this.representantes.update((lista) =>
          lista
            .map((r) => (r.id === actualizado.id ? { ...r, ...actualizado } : r))
            .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
        );
        this.guardandoEdit.set(false);
        this.porEditar.set(null);
        if (actualizado.correoEnviado !== null && actualizado.correoEnviado !== undefined) {
          // El back-end generó una contraseña temporal nueva para el correo nuevo (cuenta pendiente).
          this.avisarEnvio(actualizado, 'Datos actualizados.');
        } else {
          this.aviso.set({
            tipo: 'ok',
            texto:
              cambios.correo !== undefined && representante.googleSub
                ? `Datos de ${actualizado.nombreCompleto} actualizados. Al cambiar el correo se desvinculó su cuenta de Google: usa «Reenviar contraseña» o pídele que ingrese con Google con el correo nuevo.`
                : `Datos de ${actualizado.nombreCompleto} actualizados.`,
          });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoEdit.set(false);
        if (err.status === 409 && /modificada/i.test(mensajeServidor(err) ?? '')) {
          // Otra persona cambió la cuenta: se recarga la lista para tener la versión nueva.
          this.errorEditar.set('Otra persona modificó esta cuenta. Se actualizó la lista: cierra y vuelve a abrir «Editar».');
          this.cargar();
        } else if (err.status === 409) {
          this.errorCorreoEditServidor.set('Ya existe una cuenta registrada con este correo.');
        } else if (err.status === 404) {
          this.errorEditar.set('El representante ya no existe. Actualiza la lista.');
        } else {
          this.errorEditar.set(mensajeServidor(err) ?? 'No se pudo actualizar al representante. Intenta de nuevo.');
        }
      },
    });
  }

  // --- Desactivación ---

  /** Cuenta si el correo con la contraseña temporal salió o no. */
  private avisarEnvio(cuenta: CuentaDTO, inicio: string): void {
    if (cuenta.correoEnviado === null || cuenta.correoEnviado === undefined) {
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

  protected reenviarContrasena(representante: CuentaDTO): void {
    this.reenviandoId.set(representante.id);
    this.aviso.set(null);
    this.api.reenviarContrasena(representante.id).subscribe({
      next: (actualizado) => {
        this.representantes.update((lista) => lista.map((r) => (r.id === actualizado.id ? { ...r, ...actualizado } : r)));
        this.reenviandoId.set(null);
        this.avisarEnvio(actualizado, 'Contraseña temporal nueva generada.');
      },
      error: () => {
        this.reenviandoId.set(null);
        this.aviso.set({ tipo: 'alerta', texto: 'No se pudo reenviar la contraseña temporal. Intenta de nuevo.' });
      },
    });
  }

  protected activarId = signal<number | null>(null);

  protected activar(representante: CuentaDTO): void {
    this.activarId.set(representante.id);
    this.aviso.set(null);
    this.api.activar(representante.id).subscribe({
      next: (actualizado) => {
        this.representantes.update((lista) => lista.map((r) => (r.id === actualizado.id ? actualizado : r)));
        this.activarId.set(null);
        this.aviso.set({
          tipo: 'ok',
          texto: `${actualizado.nombreCompleto} quedó ${actualizado.estado === 'ACTIVA' ? 'activo' : 'pendiente de su primer ingreso'}.`,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.activarId.set(null);
        this.aviso.set({
          tipo: 'alerta',
          texto: err.status === 409 ? 'El representante ya estaba activo.' : 'No se pudo reactivar al representante.',
        });
        if (err.status === 409) this.cargar();
      },
    });
  }

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

  // --- Eliminar (solo si no tiene datos relacionados) ---

  protected readonly porEliminar = signal<CuentaDTO | null>(null);
  protected readonly eliminando = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

  protected pedirEliminar(registro: CuentaDTO): void {
    this.errorEliminar.set(null);
    this.porEliminar.set(registro);
  }

  protected cancelarEliminar(): void {
    if (!this.eliminando()) this.porEliminar.set(null);
  }

  protected confirmarEliminar(): void {
    const registro = this.porEliminar();
    if (!registro || this.eliminando()) return;
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    this.api.eliminar(registro.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.porEliminar.set(null);
        this.representantes.update((lista) => lista.filter((x) => x.id !== registro.id));
        this.aviso.set({ tipo: 'ok', texto: `${registro.nombreCompleto} fue eliminado.` });
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando.set(false);
        this.errorEliminar.set(
          mensajeServidor(err) ??
            (err.status === 404
              ? 'El registro ya no existe. Actualiza la lista.'
              : 'No se pudo eliminar. Intenta de nuevo.'),
        );
      },
    });
  }
}
