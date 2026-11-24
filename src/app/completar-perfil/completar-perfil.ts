import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '../button/button';
import { errorNombre, normalizarNombre, REGLA_NOMBRE } from '../core/contrasena';
import { errorNombreEmpresa, normalizarEmpresa } from '../core/empresa-nombre';
import { Field } from '../field/field';
import { SessionService } from '../services/session';
import { LogoComponent } from '../shared/logo/logo.component';

/**
 * Primer ingreso con Google: la cuenta ya existe, pero falta confirmar el nombre de la persona (viene
 * de Google y se puede corregir) y poner el nombre de su empresa. Es lo único que se puede hacer con
 * la sesión hasta completarlo.
 */
@Component({
  imports: [Button, Field, LogoComponent],
  selector: 'vc-completar-perfil',
  styleUrl: './completar-perfil.css',
  templateUrl: './completar-perfil.html',
})
export class CompletarPerfil {
  private readonly sesion = inject(SessionService);

  protected readonly regla = REGLA_NOMBRE;
  protected readonly correo = computed(() => this.sesion.usuario()?.correo ?? '');

  // El nombre llega prellenado con el que entregó Google.
  protected readonly nombre = signal(normalizarNombre(this.sesion.usuario()?.nombreCompleto ?? ''));
  protected readonly empresa = signal('');
  protected readonly intento = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);

  protected readonly errorNombre = computed(() => (this.intento() ? errorNombre(this.nombre()) : null));
  protected readonly errorEmpresa = computed(() => (this.intento() ? errorNombreEmpresa(this.empresa()) : null));

  protected async guardar(): Promise<void> {
    this.intento.set(true);
    this.errorServidor.set(null);
    if (this.errorNombre() || this.errorEmpresa()) return;

    this.guardando.set(true);
    try {
      await this.sesion.completarPerfil(normalizarNombre(this.nombre()), normalizarEmpresa(this.empresa()));
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      this.errorServidor.set(
        status === 409
          ? 'Ya existe una empresa con ese nombre. Escribe otro.'
          : status === 400
            ? 'Revisa los datos: el nombre solo admite letras y espacios.'
            : 'No se pudo guardar. Intenta de nuevo.',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  protected salir(): void {
    void this.sesion.salir();
  }
}
