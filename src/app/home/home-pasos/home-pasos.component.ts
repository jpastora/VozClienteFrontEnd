import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { PasoUso } from '../home-contenido';

/**
 * Sección «Cómo funciona»: lista de pasos a la izquierda y una vista fija a la derecha que cambia
 * según el paso que ocupa el centro de la pantalla. Una línea Filament marca el avance.
 */
@Component({
  selector: 'vc-home-pasos',
  styleUrl: './home-pasos.component.css',
  templateUrl: './home-pasos.component.html',
})
export class HomePasosComponent {
  /** Pasos del flujo de uso. */
  readonly pasos = input.required<PasoUso[]>();

  /** Índice del paso visible. */
  protected readonly activo = signal(0);

  /** Escala de la línea de avance, de 0 a 1. */
  protected readonly avance = computed(() => (this.activo() + 1) / Math.max(1, this.pasos().length));

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.observarPasos());
  }

  /**
   * Activa un paso al enfocarlo con el teclado o al hacer clic.
   *
   * @param indice posición del paso
   */
  protected seleccionar(indice: number): void {
    this.activo.set(indice);
  }

  /** Activa el paso que cruza la franja central de la pantalla. */
  private observarPasos(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const articulos = Array.from(this.elemento.nativeElement.querySelectorAll<HTMLElement>('.vc-pasos__paso'));
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            this.activo.set(articulos.indexOf(entrada.target as HTMLElement));
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    articulos.forEach((articulo) => observador.observe(articulo));
    this.destroyRef.onDestroy(() => observador.disconnect());
  }
}