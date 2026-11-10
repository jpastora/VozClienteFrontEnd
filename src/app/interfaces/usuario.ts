/**
 * Roles de la ERS, con los mismos valores que el enum RolCuenta del back-end.
 * La validación real de permisos ocurre en el back-end (RNF-01).
 */
export type RolInfo = 'ADMINISTRADOR' | 'CLIENTE_ADMINISTRADOR' | 'REPRESENTANTE';

/** Persona con sesión iniciada; la devuelve GET /api/auth/yo (SesionDTO del back-end). */
export interface UsuarioInfo {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol: RolInfo;
  /** Nulo para el administrador de la plataforma. */
  empresaId: number | null;
}
