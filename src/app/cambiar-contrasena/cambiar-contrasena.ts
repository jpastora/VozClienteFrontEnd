import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '../button/button';
import { errorContrasena, REGLA_CONTRASENA } from '../core/contrasena';
import { Field } from '../field/field';
import { SessionService } from '../services/session';
import { LogoComponent } from '../shared/logo/logo.component';

/**
 * Cambio obligatorio de la contraseña temporal que se recibe por correo: es lo único que se puede
 * hacer con la sesión hasta elegir una contraseña propia.
 */
@Component({
  imports: [Button, Field, LogoComponent],
  selector: 'vc-cambiar-contrasena',
  styleUrl: './cambiar-contrasena.css',
  templateUrl: './cambiar-contrasena.html',
})
export class CambiarContrasena {
  private readonly sesion = inject(SessionService);

  protected readonly regla = REGLA_CONTRASENA;
  protected readonly nombre = computed(() => this.sesion.usuario()?.nombreCompleto ?? '');

  protected readonly actual = signal('');
  protected readonly nueva = signal('');
  protected readonly confirmacion = signal('');
  protected readonly intento = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);

  protected readonly errorActual = computed(() =>
    this.intento() && !this.actual() ? 'Escribe la contraseña temporal que recibiste.' : null,
  );

  protected readonly errorNueva = computed(() => {
    if (!this.intento()) return null;
    const mensaje = errorContrasena(this.nueva());
    if (mensaje) return mensaje;
    return this.nueva() === this.actual() ? 'La contraseña nueva debe ser distinta de la temporal.' : null;
  });

  protected readonly errorConfirmacion = computed(() =>
    this.intento() && this.nueva() !== this.confirmacion() ? 'Las contraseñas no coinciden.' : null,
  );

  protected async guardar(): Promise<void> {
    this.intento.set(true);
    this.errorServidor.set(null);
    if (this.errorActual() || this.errorNueva() || this.errorConfirmacion()) return;

    this.guardando.set(true);
    try {
      await this.sesion.cambiarContrasena(this.actual(), this.nueva());
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      this.errorServidor.set(
        status === 401
          ? 'La contraseña temporal no es correcta o ya venció. Pide que te la reenvíen.'
          : status === 400
            ? `La contraseña nueva no es válida. ${REGLA_CONTRASENA}`
            : 'No se pudo cambiar la contraseña. Intenta de nuevo.',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  protected salir(): void {
    void this.sesion.salir();
  }
}
