import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input } from '@angular/core';

/**
 * Onda de audio animada: barras verticales que se mueven como una señal de voz y crecen cerca
 * del puntero. Es el motivo visual del home («de la voz al dato»).
 *
 * Rendimiento: solo anima transform y opacity, se pausa fuera de pantalla y queda estática
 * con movimiento reducido. Es decorativa, por eso se oculta a los lectores de pantalla.
 */
@Component({
  selector: 'vc-waveform',
  styleUrl: './waveform.component.css',
  templateUrl: './waveform.component.html',
  host: {
    class: 'vc-waveform',
    'aria-hidden': 'true',
    '(pointermove)': 'moverPuntero($event)',
    '(pointerleave)': 'soltarPuntero()',
  },
})
export class WaveformComponent {
  /** Cantidad de barras. */
  readonly cantidad = input(56);

  protected readonly barras = computed(() => Array.from({ length: this.cantidad() }, (_, indice) => indice));

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Posición horizontal del puntero entre 0 y 1, o nulo si está fuera. */
  private punteroX: number | null = null;
  private visible = false;
  private cuadro = 0;

  constructor() {
    afterNextRender(() => this.iniciar());
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.cuadro));
  }

  /**
   * Guarda la posición del puntero sobre la onda.
   *
   * @param evento movimiento del puntero
   */
  protected moverPuntero(evento: PointerEvent): void {
    const caja = this.elemento.nativeElement.getBoundingClientRect();
    this.punteroX = (evento.clientX - caja.left) / caja.width;
  }

  /** El puntero salió de la onda. */
  protected soltarPuntero(): void {
    this.punteroX = null;
  }

  /** Dibuja la forma inicial y arranca la animación cuando la onda es visible. */
  private iniciar(): void {
    const barras = Array.from(this.elemento.nativeElement.querySelectorAll<HTMLElement>('.vc-waveform__barra'));
    this.dibujar(barras, 0);

    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducido || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observador = new IntersectionObserver(([entrada]) => {
      this.visible = entrada.isIntersecting;
      if (this.visible) {
        this.animar(barras);
      }
    });
    observador.observe(this.elemento.nativeElement);
    this.destroyRef.onDestroy(() => observador.disconnect());
  }

  /**
   * Bucle de animación; se detiene solo cuando la onda sale de pantalla.
   *
   * @param barras elementos de las barras
   */
  private animar(barras: HTMLElement[]): void {
    cancelAnimationFrame(this.cuadro);
    const paso = (tiempo: number): void => {
      if (!this.visible) {
        return;
      }
      this.dibujar(barras, tiempo / 1000);
      this.cuadro = requestAnimationFrame(paso);
    };
    this.cuadro = requestAnimationFrame(paso);
  }

  /**
   * Calcula la altura de cada barra: envolvente centrada, dos ondas combinadas y un realce
   * alrededor del puntero.
   *
   * @param barras elementos de las barras
   * @param segundos tiempo de la animación en segundos
   */
  private dibujar(barras: HTMLElement[], segundos: number): void {
    const total = barras.length;
    barras.forEach((barra, indice) => {
      const posicion = total > 1 ? indice / (total - 1) : 0.5;
      const envolvente = Math.sin(Math.PI * posicion);
      const onda = 0.55 + 0.45 * Math.sin(segundos * 2.2 + indice * 0.45) * Math.sin(segundos * 1.3 + indice * 0.17);
      const realce = this.punteroX === null ? 0 : Math.max(0, 1 - Math.abs(posicion - this.punteroX) * 6);
      const altura = Math.min(1, 0.1 + envolvente * onda * 0.75 + realce * 0.35);
      barra.style.transform = `scaleY(${altura.toFixed(3)})`;
      barra.style.opacity = (0.3 + altura * 0.7).toFixed(2);
    });
  }
}