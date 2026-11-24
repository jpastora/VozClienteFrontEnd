/** Largo permitido del nombre de una empresa (el mismo que valida el back-end). */
export const EMPRESA_MIN = 2;
export const EMPRESA_MAX = 150;

/** Deja un solo espacio entre palabras y quita los espacios de los extremos. */
export function normalizarEmpresa(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

/**
 * Valida el nombre de una empresa (2 a 150 caracteres).
 *
 * @param valor nombre escrito
 * @returns el mensaje de error, o nulo si cumple
 */
export function errorNombreEmpresa(valor: string): string | null {
  const nombre = normalizarEmpresa(valor);
  if (!nombre) return 'El nombre de la empresa es obligatorio.';
  if (nombre.length < EMPRESA_MIN || nombre.length > EMPRESA_MAX) {
    return `Entre ${EMPRESA_MIN} y ${EMPRESA_MAX} caracteres.`;
  }
  return null;
}
