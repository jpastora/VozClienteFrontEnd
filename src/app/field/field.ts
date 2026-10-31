import { Component, input, model} from '@angular/core';

@Component({
  selector: 'vc-field',
  styleUrl: './field.css',
  templateUrl: './field.html',
})
export class Field {
  /** Id del control con el prefijo del Plan general, p. ej. txtNombreProducto. */
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password' | 'number'>('text');
  readonly error = input<string | null>(null);
  readonly value = model('');

  protected actualizar(evento: Event): void {
    this.value.set((evento.target as HTMLInputElement).value);
  }
}
