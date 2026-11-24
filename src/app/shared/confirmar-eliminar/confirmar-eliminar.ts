import { Component, input, output } from '@angular/core';
import { Button } from '../../button/button';
import { Dialog } from '../../dialog/dialog';

/**
 * Confirmación para eliminar un registro. Muestra el aviso, y si el back-end rechaza la eliminación
 * por datos relacionados (409), el motivo con el orden sugerido para depurar, sin cerrar el diálogo.
 */
@Component({
  imports: [Button, Dialog],
  selector: 'vc-confirmar-eliminar',
  styleUrl: './confirmar-eliminar.css',
  templateUrl: './confirmar-eliminar.html',
})
export class ConfirmarEliminar {
  readonly open = input<boolean>(false);
  readonly titulo = input.required<string>();
  /** Qué se elimina, p. ej. «Coca Cola». */
  readonly nombre = input<string>('');
  readonly eliminando = input<boolean>(false);
  /** Motivo por el que no se pudo eliminar; vacío mientras no haya error. */
  readonly error = input<string | null>(null);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}
