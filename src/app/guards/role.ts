import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolInfo } from '../interfaces/usuario';
import { SessionService } from '../services/session';

/** Solo oculta vistas según el rol; el back-end sigue siendo quien autoriza. */
export const roleGuard = (...roles: RolInfo[]): CanActivateFn => () => {
  const usuario = inject(SessionService).usuario();
  if (usuario && roles.includes(usuario.rol)) return true;
  return inject(Router).createUrlTree(['/auth']);
};
