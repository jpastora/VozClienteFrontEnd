import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RUTAS } from '../core/rutas';
import { RolInfo } from '../interfaces/usuario';
import { rutaInicio, rutaObligatoria, SessionService } from '../services/session';

/**
 * Exige sesión iniciada; sin sesión lleva a la pantalla de ingreso.
 * Solo ordena la navegación: el back-end sigue siendo quien autoriza (RNF-01).
 */
export const autenticadoGuard: CanActivateFn = () => {
  const usuario = inject(SessionService).usuario();
  if (!usuario) {
    return inject(Router).createUrlTree([RUTAS.ingreso]);
  }
  // Con contraseña temporal o con el perfil sin completar no se usa nada más hasta resolverlo.
  const obligatoria = rutaObligatoria(usuario);
  return obligatoria ? inject(Router).createUrlTree([obligatoria]) : true;
};

/** Pantalla de cambio de contraseña: solo con sesión y mientras la contraseña sea temporal. */
export const cambioContrasenaGuard: CanActivateFn = () => {
  const usuario = inject(SessionService).usuario();
  const router = inject(Router);
  if (!usuario) {
    return router.createUrlTree([RUTAS.ingreso]);
  }
  if (!usuario.debeCambiarContrasena) {
    return router.parseUrl(rutaObligatoria(usuario) ?? rutaInicio(usuario.rol));
  }
  return true;
};

/** Pantalla de completar perfil: solo con sesión y mientras falten el nombre y la empresa. */
export const perfilGuard: CanActivateFn = () => {
  const usuario = inject(SessionService).usuario();
  const router = inject(Router);
  if (!usuario) {
    return router.createUrlTree([RUTAS.ingreso]);
  }
  if (usuario.debeCambiarContrasena) {
    return router.createUrlTree([RUTAS.cambiarContrasena]);
  }
  return usuario.perfilCompleto ? router.parseUrl(rutaInicio(usuario.rol)) : true;
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
    const obligatoria = rutaObligatoria(usuario);
    if (obligatoria) {
      return router.createUrlTree([obligatoria]);
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
  return inject(Router).parseUrl(rutaObligatoria(usuario) ?? rutaInicio(usuario.rol));
};