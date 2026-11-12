/** Reglas de la contraseña propia de la aplicación; las mismas que valida el back-end. */
export const CONTRASENA_MIN = 8;
export const CONTRASENA_MAX = 72;
export const REGLA_CONTRASENA = 'Entre 8 y 72 caracteres, con al menos una letra y un número.';

/**
 * Valida una contraseña nueva.
 *
 * @param valor contraseña escrita
 * @returns el mensaje de error, o nulo si cumple las reglas
 */
export function errorContrasena(valor: string): string | null {
  if (!valor) return 'La contraseña es obligatoria.';
  if (valor.length < CONTRASENA_MIN || new TextEncoder().encode(valor).length > CONTRASENA_MAX) {
    return REGLA_CONTRASENA;
  }
  if (!/\p{L}/u.test(valor) || !/\p{Nd}/u.test(valor)) return REGLA_CONTRASENA;
  return null;
}
