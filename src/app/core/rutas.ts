/**
 * Rutas de la aplicación en un solo lugar. Las pantallas con sesión viven bajo /app y el home
 * público ocupa la raíz (/). Cualquier enlace interno debe tomar su ruta de aquí.
 */

/** Prefijo de las pantallas que exigen sesión (layout con menú lateral). */
export const RUTA_APP = '/app';

/** Rutas absolutas de la aplicación. */
export const RUTAS = {
  home: '/',
  ingreso: '/auth',
  app: RUTA_APP,
  inicio: `${RUTA_APP}/inicio`,
  productos: `${RUTA_APP}/productos`,
  representantes: `${RUTA_APP}/representantes`,
  salas: `${RUTA_APP}/salas`,
  entrevistas: `${RUTA_APP}/entrevistas`,
  analisis: `${RUTA_APP}/analisis`,
  reportes: `${RUTA_APP}/reportes`,
  paquetes: `${RUTA_APP}/paquetes`,
  admin: `${RUTA_APP}/admin`,
} as const;