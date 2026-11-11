import { Component, input } from '@angular/core';

/** Fondo sobre el que se dibuja el logotipo. */
export type TonoLogo = 'oscuro' | 'claro';

/** Tamaño del logotipo: alto de las barras de 24, 32 o 40 px. */
export type TamanoLogo = 'sm' | 'md' | 'lg';

/**
 * Logotipo de Voz Cliente: cinco barras de audio y el nombre del producto.
 * Es la única versión del logotipo en la aplicación (menú lateral, ingreso, videollamada y home).
 *
 * - tono 'oscuro': barras Filament y texto Paper, para fondos Code Black o Deep Circuit.
 * - tono 'claro': barras Deep Circuit con la central en Filament y texto Code Black, para fondos Paper o blancos.
 *
 * Quien lo usa puede ajustar el tamaño con las variables CSS --vc-logo-alto y --vc-logo-texto.
 */
@Component({
  selector: 'vc-logo',
  styleUrl: './logo.component.css',
  templateUrl: './logo.component.html',
  host: {
    class: 'vc-logo',
    '[attr.data-tono]': 'tono()',
    '[attr.data-tamano]': 'tamano()',
    '[class.vc-logo--animado]': 'animado()',
    '[attr.role]': "conTexto() ? null : 'img'",
    '[attr.aria-label]': "conTexto() ? null : 'Voz Cliente'",
  },
})
export class LogoComponent {
  /** Fondo sobre el que se muestra; define los colores. */
  readonly tono = input<TonoLogo>('oscuro');

  /** Tamaño de las barras y del nombre. */
  readonly tamano = input<TamanoLogo>('md');

  /** Muestra el nombre «Voz Cliente» junto a las barras. */
  readonly conTexto = input(true);

  /** Anima las barras como una onda de audio (se desactiva con movimiento reducido). */
  readonly animado = input(false);
}