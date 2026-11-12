import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorContrasena, errorNombre, normalizarNombre, REGLA_CONTRASENA } from '../core/contrasena';
import { RUTAS } from '../core/rutas';
import { Field } from '../field/field';
import { SessionService } from '../services/session';
import { RevealDirective } from '../shared/directivas/reveal.directive';
import { LogoComponent } from '../shared/logo/logo.component';
import { WaveformComponent } from '../shared/waveform/waveform.component';

/** Mensaje que se muestra en la pantalla de ingreso. */
interface MensajeIngreso {
  /** error: el ingreso falló y se puede reintentar; aviso: la cuenta necesita una acción externa. */
  tipo: 'error' | 'aviso';
  texto: string;
}

/** Ingresar con una cuenta existente, crear una nueva o pedir la recuperación de la contraseña. */
type Modo = 'ingresar' | 'registro' | 'recuperar';

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

const SIN_CONEXION: MensajeIngreso = {
  tipo: 'error',
  texto: 'No pudimos conectar con el servidor. Intente de nuevo en unos minutos.',
};

/**
 * La recuperación de contraseña necesita enviar un enlace por correo, y el proyecto todavía no tiene
 * servidor de correo. Por ahora la pantalla existe, pero no envía nada y lo dice con claridad.
 * TODO (iteración 2): llamar al endpoint de recuperación cuando exista el envío de correos.
 */
const RECUPERACION_NO_DISPONIBLE: MensajeIngreso = {
  tipo: 'aviso',
  texto:
    'La recuperación de contraseña por correo todavía no está disponible. Mientras tanto, si su cuenta ' +
    'usa un correo de Google, puede ingresar con Google; si no, comuníquese con el soporte de Voz Cliente.',
};

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pantalla de ingreso (HU-01, Figura 4 del informe de diseño): panel de marca en Code Black a la
 * izquierda y el ingreso en Paper a la derecha. Se ingresa con correo y contraseña propios de la
 * aplicación o con Google, y desde aquí se crea una cuenta nueva.
 */
@Component({
  imports: [Field, LogoComponent, RevealDirective, RouterLink, WaveformComponent],
  selector: 'vc-auth',
  styleUrl: './auth.css',
  templateUrl: './auth.html',
})
export class Auth {
  private readonly sesion = inject(SessionService);

  /** Parámetro ?error= que deja el back-end cuando el ingreso con Google no se completa. */
  readonly error = input<string>();

  /** Rutas absolutas para los enlaces de la plantilla. */
  protected readonly rutas = RUTAS;
  protected readonly reglaContrasena = REGLA_CONTRASENA;

  protected readonly modo = signal<Modo>('ingresar');
  protected readonly nombre = signal('');
  protected readonly correo = signal('');
  protected readonly contrasena = signal('');
  protected readonly confirmacion = signal('');
  protected readonly intento = signal(false);
  protected readonly enviando = signal(false);

  /** Resultado del último envío del formulario; tiene prioridad sobre el mensaje de Google. */
  private readonly mensajeFormulario = signal<MensajeIngreso | null>(null);

  /** Mensaje visible: el del formulario o, si no hay, el que dejó el ingreso con Google. */
  protected readonly mensaje = computed<MensajeIngreso | null>(() => {
    const formulario = this.mensajeFormulario();
    if (formulario) return formulario;
    const codigo = this.error();
    return codigo ? (MENSAJES[codigo] ?? MENSAJE_GENERICO) : null;
  });

  protected readonly titulo = computed(() =>
    ({ ingresar: 'Ingresar', registro: 'Crear cuenta', recuperar: 'Recuperar contraseña' })[this.modo()],
  );

  protected readonly textoBoton = computed(() => {
    switch (this.modo()) {
      case 'ingresar':
        return this.enviando() ? 'Ingresando…' : 'Ingresar';
      case 'registro':
        return this.enviando() ? 'Creando cuenta…' : 'Crear cuenta';
      case 'recuperar':
        return 'Enviar enlace';
    }
  });

  // ---- Validación por campo (conserva lo escrito) ----

  protected readonly errorNombre = computed<string | null>(() => {
    if (!this.intento() || this.modo() !== 'registro') return null;
    return errorNombre(this.nombre());
  });

  protected readonly errorCorreo = computed<string | null>(() => {
    if (!this.intento()) return null;
    const valor = this.correo().trim();
    if (!valor) return 'El correo es obligatorio.';
    if (!PATRON_CORREO.test(valor)) return 'El formato del correo no es válido.';
    return null;
  });

  protected readonly errorContrasena = computed<string | null>(() => {
    if (!this.intento() || this.modo() === 'recuperar') return null;
    if (this.modo() === 'ingresar') return this.contrasena() ? null : 'La contraseña es obligatoria.';
    return errorContrasena(this.contrasena());
  });

  protected readonly errorConfirmacion = computed<string | null>(() => {
    if (!this.intento() || this.modo() !== 'registro') return null;
    return this.confirmacion() === this.contrasena() ? null : 'Las contraseñas no coinciden.';
  });

  /** Cambia entre ingresar, crear cuenta y recuperar la contraseña, conservando el correo escrito. */
  protected cambiarModo(modo: Modo): void {
    this.modo.set(modo);
    this.intento.set(false);
    this.contrasena.set('');
    this.confirmacion.set('');
    this.mensajeFormulario.set(null);
  }

  /** Ingresa o crea la cuenta con correo y contraseña. */
  protected async enviar(): Promise<void> {
    this.intento.set(true);
    if (this.errorNombre() || this.errorCorreo() || this.errorContrasena() || this.errorConfirmacion()) return;

    if (this.modo() === 'recuperar') {
      // Todavía no se envía ningún correo (ver RECUPERACION_NO_DISPONIBLE).
      this.mensajeFormulario.set(RECUPERACION_NO_DISPONIBLE);
      return;
    }

    this.enviando.set(true);
    this.mensajeFormulario.set(null);
    const correo = this.correo().trim().toLowerCase();
    try {
      if (this.modo() === 'ingresar') {
        await this.sesion.ingresarConContrasena(correo, this.contrasena());
      } else {
        await this.sesion.registrar(normalizarNombre(this.nombre()), correo, this.contrasena());
      }
    } catch (error: unknown) {
      this.mensajeFormulario.set(this.mensajeDeError(error));
      // Se borra la contraseña por seguridad; sin marcar el campo vacío como error todavía.
      this.contrasena.set('');
      this.confirmacion.set('');
      this.intento.set(false);
    } finally {
      this.enviando.set(false);
    }
  }

  /** Inicia (o reintenta) el ingreso con Google. */
  protected ingresarConGoogle(): void {
    this.sesion.iniciarConGoogle();
  }

  private mensajeDeError(error: unknown): MensajeIngreso {
    const estado = error instanceof HttpErrorResponse ? error.status : -1;
    if (this.modo() === 'ingresar') {
      if (estado === 401) return { tipo: 'error', texto: 'Correo o contraseña incorrectos.' };
      if (estado === 403) return MENSAJES['cuenta_inactiva'];
    } else {
      if (estado === 409) {
        return {
          tipo: 'aviso',
          texto: 'Ya existe una cuenta con este correo. Ingrese con su contraseña o con Google.',
        };
      }
      if (estado === 400) return { tipo: 'error', texto: 'Revise los datos: el nombre solo admite letras y la contraseña debe cumplir las reglas.' };
    }
    if (estado === 0 || estado >= 500) return SIN_CONEXION;
    return MENSAJE_GENERICO;
  }
}
