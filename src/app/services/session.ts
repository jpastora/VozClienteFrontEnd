import { computed, Service, signal } from '@angular/core';
import { UsuarioInfo } from '../interfaces/usuario';

/**
 * Estado de la sesión en memoria. No se guarda nada en el almacenamiento del navegador:
 * la sesión viaja en una cookie HttpOnly emitida por el back-end (se conectará en HU-01).
 */
@Service()
export class SessionService {
  private readonly _usuario = signal<UsuarioInfo | null>(null);
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);

  establecer(usuario: UsuarioInfo | null): void {
    this._usuario.set(usuario);
  }
}
