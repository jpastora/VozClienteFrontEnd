import { Component, input} from '@angular/core';

@Component({
  selector: 'vc-metric-card',
  styleUrl: './metric-card.css',
  templateUrl: './metric-card.html',
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
}
