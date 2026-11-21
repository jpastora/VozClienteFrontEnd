import { HttpErrorResponse } from '@angular/common/http';

/** Motivo que devolvió el back-end ({"mensaje": "..."}), si lo hay. */
export function mensajeServidor(err: HttpErrorResponse): string | null {
  const m = (err.error as { mensaje?: unknown } | null)?.mensaje;
  return typeof m === 'string' && m.trim() ? m.trim() : null;
}
