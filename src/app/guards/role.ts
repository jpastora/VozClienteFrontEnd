import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RUTAS } from '../core/rutas';
import { RolInfo } from '../interfaces/usuario';
import { rutaInicio, SessionService } from '../services/session';

/**
 * Exige sesión iniciada; sin sesión lleva a la pantalla de ingreso.
 * Solo ordena la navegación: el back-end sigue siendo quien autoriza (RNF-01).
 */
export const autenticadoGuard: CanActivateFn = () => {
  const usuario = inject(SessionService).usuario();
  if (!usuario) {
    return inject(Router).createUrlTree([RUTAS.ingreso]);
  }
  // Con contraseña temporal no se usa nada más hasta cambiarla.
  if (usuario.debeCambiarContrasena) {
    return inject(Router).createUrlTree([RUTAS.cambiarContrasena]);
  }
  return true;
};

/** Pantalla de cambio de contraseña: solo con sesión y mientras la contraseña sea temporal. */
export const cambioContrasenaGuard: CanActivateFn = () => {
  const usuario = inject(SessionService).usuario();
  const router = inject(Router);
  if (!usuario) {
    return router.createUrlTree([RUTAS.ingreso]);
  }
  return usuario.debeCambiarContrasena ? true : router.parseUrl(rutaInicio(usuario.rol));
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
      return router.createUrlTree([RUTAS.ingreso]);
    }
    if (usuario.debeCambiarContrasena) {
      return router.createUrlTree([RUTAS.cambiarContrasena]);
    }
    if (roles.includes(usuario.rol)) {
      return true;
    }
    return router.parseUrl(rutaInicio(usuario.rol));
  };

/** La pantalla de ingreso solo se muestra sin sesión; con sesión lleva al inicio del perfil. */
export const invitadoGuard: CanActivateFn = () => {
  const usuario = inject(SessionService).usuario();
  if (!usuario) {
    return true;
  }
  return inject(Router).parseUrl(usuario.debeCambiarContrasena ? RUTAS.cambiarContrasena : rutaInicio(usuario.rol));
};