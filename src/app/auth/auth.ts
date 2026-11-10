import { Component, computed, inject, input } from '@angular/core';
import { Button } from '../button/button';
import { SessionService } from '../services/session';

/**
 * Mensajes para cada código que envía el back-end en /auth?error=... (RF-01, manejo de excepciones).
 * Ninguno expone datos técnicos.
 */
const MENSAJES_ERROR: Record<string, string> = {
  consentimiento_cancelado: 'Cancelaste el ingreso con Google. Puedes intentarlo de nuevo cuando quieras.',
  google_no_disponible: 'No pudimos comunicarnos con Google. Intenta de nuevo en unos minutos.',
  cuenta_inactiva: 'Tu cuenta está inactiva. Comunícate con el administrador de tu empresa.',
  correo_no_verificado: 'Tu correo de Google no está verificado. Verifícalo en tu cuenta de Google e intenta de nuevo.',
  cuenta_vinculada_a_otro:
    'Este correo ya está asociado a otra cuenta de Google. Ingresa con la cuenta que usaste la primera vez.',
  datos_incompletos: 'Google no envió los datos necesarios para ingresar. Intenta de nuevo.',
  sesion_expirada: 'Tu sesión se cerró por inactividad. Ingresa de nuevo para continuar.',
};

const MENSAJE_GENERICO = 'No se pudo iniciar sesión. Intenta de nuevo.';

/** Pantalla de ingreso con Google (HU-01, prototipo "Inicio de sesión con Google"). */
@Component({
  imports: [Button],
  selector: 'vc-auth',
  styleUrl: './auth.css',
  templateUrl: './auth.html',
})
export class Auth {
  private readonly sesion = inject(SessionService);

  /** Parámetro ?error= que deja el back-end cuando el ingreso no se completa. */
  readonly error = input<string>();

  protected readonly mensajeError = computed(() => {
    const codigo = this.error();
    return codigo ? (MENSAJES_ERROR[codigo] ?? MENSAJE_GENERICO) : null;
  });

  /** Inicia (o reintenta) el ingreso con Google. */
  protected ingresar(): void {
    this.sesion.iniciarConGoogle();
  }
}
