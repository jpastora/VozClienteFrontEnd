/** Reglas de la contraseña propia de la aplicación; las mismas que valida el back-end. */
export const CONTRASENA_MIN = 8;
export const CONTRASENA_MAX = 20;
export const REGLA_CONTRASENA = 'Entre 8 y 20 caracteres, con al menos una mayúscula, una minúscula y un número.';

/** Regla del nombre completo: solo letras (con tildes, ñ y ü) separadas por un espacio. */
export const REGLA_NOMBRE = 'Solo letras y espacios, sin números ni caracteres especiales.';
const PATRON_NOMBRE = /^\p{L}+( \p{L}+)*$/u;

/**
 * Valida una contraseña nueva.
 *
 * @param valor contraseña escrita
 * @returns el mensaje de error, o nulo si cumple las reglas
 */
export function errorContrasena(valor: string): string | null {
  if (!valor) return 'La contraseña es obligatoria.';
  if (valor.length < CONTRASENA_MIN || valor.length > CONTRASENA_MAX) return REGLA_CONTRASENA;
  if (!/\p{Lu}/u.test(valor) || !/\p{Ll}/u.test(valor) || !/\p{Nd}/u.test(valor)) return REGLA_CONTRASENA;
  return null;
}

/**
 * Deja un solo espacio entre palabras y quita los espacios de los extremos.
 *
 * @param valor nombre escrito
 * @returns el nombre normalizado
 */
export function normalizarNombre(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

/**
 * Valida el nombre completo (2 a 100 caracteres, solo letras y espacios).
 *
 * @param valor nombre escrito
 * @returns el mensaje de error, o nulo si cumple las reglas
 */
export function errorNombre(valor: string): string | null {
  const nombre = normalizarNombre(valor);
  if (!nombre) return 'El nombre completo es obligatorio.';
  if (nombre.length < 2 || nombre.length > 100) return 'Entre 2 y 100 caracteres.';
  if (!PATRON_NOMBRE.test(nombre)) return REGLA_NOMBRE;
  return null;
}
