import { Component, input} from '@angular/core';

@Component({
  selector: 'vc-badge',
  styleUrl: './badge.css',
  templateUrl: './badge.html',
  host: { '[attr.data-tone]': 'tone()' },
})
export class Badge {
  readonly tone = input<'neutral' | 'success' | 'danger'>('neutral');
}
