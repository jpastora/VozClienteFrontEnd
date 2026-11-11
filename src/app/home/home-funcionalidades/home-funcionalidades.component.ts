import { Component, input } from '@angular/core';
import { RevealDirective } from '../../shared/directivas/reveal.directive';
import { Funcionalidad } from '../home-contenido';

/** Cuadrícula de funcionalidades del home: cinco tarjetas con ilustraciones animadas en CSS. */
@Component({
  imports: [RevealDirective],
  selector: 'vc-home-funcionalidades',
  styleUrl: './home-funcionalidades.component.css',
  templateUrl: './home-funcionalidades.component.html',
})
export class HomeFuncionalidadesComponent {
  /** Funcionalidades a mostrar, en orden de la cuadrícula. */
  readonly funcionalidades = input.required<Funcionalidad[]>();
}