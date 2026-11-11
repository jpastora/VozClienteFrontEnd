import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi, URL_INGRESO_GOOGLE } from '../core/auth-api';
import { RUTAS } from '../core/rutas';
import { RolInfo, UsuarioInfo } from '../interfaces/usuario';

/**
 * Pantalla de inicio de cada perfil (navegación por perfil, HU-01).
 *
 * @param rol rol de la persona con sesión
 * @returns ruta a la que se dirige después de ingresar
 */
export function rutaInicio(rol: RolInfo): string {
  switch (rol) {
    case 'ADMINISTRADOR':
      return RUTAS.admin;
    case 'REPRESENTANTE':
      return RUTAS.salas;
    default:
      return RUTAS.inicio;
  }
}

/**
 * Estado de la sesión en memoria. No se guarda nada en el almacenamiento del navegador:
 * la sesión viaja en una cookie HttpOnly emitida por el back-end (HU-01).
 */
@Service()
export class SessionService {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly _usuario = signal<UsuarioInfo | null>(null);
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);

  /**
   * Consulta al back-end quién tiene la sesión. Se ejecuta al iniciar la aplicación; si no hay
   * sesión (401) o el back-end no responde, la aplicación arranca sin usuario.
   *
   * @returns promesa que se resuelve cuando se conoce el estado de la sesión
   */
  async cargar(): Promise<void> {
    try {
      this._usuario.set(await firstValueFrom(this.authApi.obtenerSesion()));
    } catch {
      this._usuario.set(null);
    }
  }

  /**
   * Reemplaza la persona con sesión.
   *
   * @param usuario datos de la sesión, o nulo para limpiarla
   */
  establecer(usuario: UsuarioInfo | null): void {
    this._usuario.set(usuario);
  }

  /** Navega al ingreso con Google; al volver, el back-end redirige a la aplicación con la sesión iniciada. */
  iniciarConGoogle(): void {
    window.location.assign(URL_INGRESO_GOOGLE);
  }

  /**
   * Cierra la sesión en el back-end y vuelve a la pantalla de ingreso.
   *
   * @returns promesa que se resuelve al terminar la navegación
   */
  async salir(): Promise<void> {
    try {
      await firstValueFrom(this.authApi.salir());
    } catch {
      // Aunque el back-end no responda, la sesión se limpia en la interfaz.
    }
    this._usuario.set(null);
    await this.router.navigateByUrl(RUTAS.ingreso);
  }
}