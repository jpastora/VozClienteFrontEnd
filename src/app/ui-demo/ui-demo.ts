import { Component, signal } from '@angular/core';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { Dialog } from '../dialog/dialog';
import { Field } from '../field/field';
import { MetricCard } from '../metric-card/metric-card';

/** Catálogo de componentes vc-; sirve de verificación visual del estilo. */
@Component({
  imports: [Badge, Button, Dialog, Field, MetricCard],
  selector: 'vc-ui-demo',
  styleUrl: './ui-demo.css',
  templateUrl: './ui-demo.html',
})
export class UiDemo {
  protected readonly nombre = signal('');
  protected readonly abierto = signal(false);
}
