import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/** Duración del conteo en milisegundos. */
const DURACION_CONTEO = 1200;

/**
 * Cuenta de 0 al valor indicado la primera vez que el elemento entra en pantalla.
 * El valor final está en el texto desde el inicio (lectores de pantalla y movimiento reducido).
 *
 * Uso: <strong [vcCountUp]="7" vcCountUpSufijo=" días"></strong>
 */
@Directive({
  selector: '[vcCountUp]',
})
export class CountUpDirective {
  /** Número final. */
  readonly vcCountUp = input.required<number>();

  /** Texto opcional después del número, p. ej. "%". */
  readonly vcCountUpSufijo = input('');

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private cuadro = 0;

  constructor() {
    afterNextRender(() => {
      this.escribir(this.vcCountUp());
      const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reducido && typeof IntersectionObserver !== 'undefined') {
        this.observar();
      }
    });
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.cuadro));
  }

  /** Inicia el conteo cuando el elemento es visible. */
  private observar(): void {
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          observador.disconnect();
          this.contar();
        }
      },
      { threshold: 0.6 },
    );
    observador.observe(this.elemento.nativeElement);
    this.destroyRef.onDestroy(() => observador.disconnect());
  }

  /** Anima el número con una curva de salida suave. */
  private contar(): void {
    const final = this.vcCountUp();
    const inicio = performance.now();
    const paso = (ahora: number): void => {
      const avance = Math.min(1, (ahora - inicio) / DURACION_CONTEO);
      const suavizado = 1 - Math.pow(1 - avance, 3);
      this.escribir(Math.round(final * suavizado));
      if (avance < 1) {
        this.cuadro = requestAnimationFrame(paso);
      }
    };
    this.cuadro = requestAnimationFrame(paso);
  }

  /**
   * Escribe el número con su sufijo.
   *
   * @param valor número a mostrar
   */
  private escribir(valor: number): void {
    this.elemento.nativeElement.textContent = `${valor}${this.vcCountUpSufijo()}`;
  }
}