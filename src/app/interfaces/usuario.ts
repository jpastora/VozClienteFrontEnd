/** Roles de la ERS. La validación real de permisos ocurre en el back-end (RNF-01). */
export type RolInfo = 'ADMIN_PLATAFORMA' | 'CLIENTE_ADMINISTRADOR' | 'REPRESENTANTE';

export interface UsuarioInfo {
  id: number;
  nombre: string;
  rol: RolInfo;
}
