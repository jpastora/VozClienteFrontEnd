import { Component, input, output} from '@angular/core';

@Component({
  selector: 'vc-dialog',
  styleUrl: './dialog.css',
  templateUrl: './dialog.html',
})
export class Dialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closed = output<void>();
}
