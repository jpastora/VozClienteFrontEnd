import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Revela el elemento con un fundido y un desplazamiento corto la primera vez que entra en pantalla.
 * Las clases vc-reveal y vc-reveal--visible están en src/styles.css; con movimiento reducido
 * el elemento se muestra sin animación.
 *
 * Uso: <h2 vcReveal [vcRevealRetraso]="120">…</h2>
 */
@Directive({
  selector: '[vcReveal]',
  host: {
    class: 'vc-reveal',
    '[style.--vc-reveal-retraso.ms]': 'vcRevealRetraso()',
  },
})
export class RevealDirective {
  /** Retraso de la animación en milisegundos, para escalonar elementos de una lista. */
  readonly vcRevealRetraso = input(0);

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.observar());
  }

  /** Agrega vc-reveal--visible cuando al menos el 20 % del elemento es visible. */
  private observar(): void {
    const nodo = this.elemento.nativeElement;
    if (typeof IntersectionObserver === 'undefined') {
      nodo.classList.add('vc-reveal--visible');
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          nodo.classList.add('vc-reveal--visible');
          observador.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observador.observe(nodo);
    this.destroyRef.onDestroy(() => observador.disconnect());
  }
}