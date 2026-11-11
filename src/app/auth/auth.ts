import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RUTAS } from '../core/rutas';
import { SessionService } from '../services/session';
import { RevealDirective } from '../shared/directivas/reveal.directive';
import { LogoComponent } from '../shared/logo/logo.component';
import { WaveformComponent } from '../shared/waveform/waveform.component';

/** Mensaje que se muestra bajo el botón de Google. */
interface MensajeIngreso {
  /** error: el ingreso falló y se puede reintentar; aviso: la cuenta necesita una acción externa. */
  tipo: 'error' | 'aviso';
  texto: string;
}

/**
 * Mensajes para cada código que envía el back-end en /auth?error=... (RF-01, manejo de excepciones).
 * Ninguno expone datos técnicos.
 */
const MENSAJES: Record<string, MensajeIngreso> = {
  consentimiento_cancelado: {
    tipo: 'error',
    texto: 'No se completó el inicio de sesión porque se canceló el consentimiento. Puede intentarlo de nuevo.',
  },
  google_no_disponible: {
    tipo: 'error',
    texto: 'No pudimos comunicarnos con Google. Intente de nuevo en unos minutos.',
  },
  cuenta_inactiva: {
    tipo: 'aviso',
    texto: 'Su cuenta está inactiva. Comuníquese con el administrador de su empresa.',
  },
  correo_no_verificado: {
    tipo: 'aviso',
    texto: 'Su correo de Google no está verificado. Verifíquelo en su cuenta de Google e intente de nuevo.',
  },
  cuenta_vinculada_a_otro: {
    tipo: 'error',
    texto: 'Este correo ya está asociado a otra cuenta de Google. Ingrese con la cuenta que usó la primera vez.',
  },
  datos_incompletos: {
    tipo: 'error',
    texto: 'Google no envió los datos necesarios para ingresar. Intente de nuevo.',
  },
  sesion_expirada: {
    tipo: 'aviso',
    texto: 'Su sesión se cerró por inactividad. Ingrese de nuevo para continuar.',
  },
};

const MENSAJE_GENERICO: MensajeIngreso = {
  tipo: 'error',
  texto: 'No se pudo iniciar sesión. Intente de nuevo.',
};

/**
 * Pantalla de ingreso con Google (HU-01, Figura 4 del informe de diseño): panel de marca en
 * Code Black a la izquierda y el ingreso en Paper a la derecha.
 */
@Component({
  imports: [LogoComponent, RevealDirective, RouterLink, WaveformComponent],
  selector: 'vc-auth',
  styleUrl: './auth.css',
  templateUrl: './auth.html',
})
export class Auth {
  private readonly sesion = inject(SessionService);

  /** Parámetro ?error= que deja el back-end cuando el ingreso no se completa. */
  readonly error = input<string>();

  /** Rutas absolutas para los enlaces de la plantilla. */
  protected readonly rutas = RUTAS;

  /** Mensaje del código recibido, o nulo si no hubo error. */
  protected readonly mensaje = computed<MensajeIngreso | null>(() => {
    const codigo = this.error();
    return codigo ? (MENSAJES[codigo] ?? MENSAJE_GENERICO) : null;
  });

  /** Inicia (o reintenta) el ingreso con Google. */
  protected ingresar(): void {
    this.sesion.iniciarConGoogle();
  }
}