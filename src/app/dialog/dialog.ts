import { Component, input, output } from '@angular/core';

@Component({
  selector: 'vc-dialog',
  standalone: true,
  styleUrl: './dialog.css',
  templateUrl: './dialog.html',
})
export class Dialog {
  readonly open = input<boolean>(false);
  readonly title = input.required<string>();
  readonly closed = output<void>();
}
