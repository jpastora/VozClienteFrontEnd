import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolInfo } from '../interfaces/usuario';
import { rutaInicio, SessionService } from '../services/session';

/**
 * Exige sesión iniciada; sin sesión lleva a la pantalla de ingreso.
 * Solo ordena la navegación: el back-end sigue siendo quien autoriza (RNF-01).
 */
export const autenticadoGuard: CanActivateFn = () => {
  if (inject(SessionService).autenticado()) {
    return true;
  }
  return inject(Router).createUrlTree(['/auth']);
};

/**
 * Permite la ruta solo a los roles indicados. Sin sesión lleva al ingreso; con otro rol lleva a la
 * pantalla de inicio de su perfil.
 *
 * @param roles roles que pueden ver la ruta
 * @returns la guarda para la ruta
 */
export const roleGuard =
  (...roles: RolInfo[]): CanActivateFn =>
  () => {
    const usuario = inject(SessionService).usuario();
    const router = inject(Router);
    if (!usuario) {
      return router.createUrlTree(['/auth']);
    }
    if (roles.includes(usuario.rol)) {
      return true;
    }
    return router.parseUrl(rutaInicio(usuario.rol));
  };

/** La pantalla de ingreso solo se muestra sin sesión; con sesión lleva al inicio del perfil. */
export const invitadoGuard: CanActivateFn = () => {
  const usuario = inject(SessionService).usuario();
  return usuario ? inject(Router).parseUrl(rutaInicio(usuario.rol)) : true;
};
