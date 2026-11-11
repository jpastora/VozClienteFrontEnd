import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { LineaTranscripcion } from '../home-contenido';

/** Milisegundos entre cada carácter escrito. */
const VELOCIDAD_ESCRITURA = 22;

/** Intención de compra de la entrevista de ejemplo, en porcentaje. */
const INTENCION_EJEMPLO = 78;

/** Línea de la transcripción con el texto visible hasta el momento. */
interface LineaVisible extends LineaTranscripcion {
  visible: string;
  escribiendo: boolean;
}

/**
 * Demostración del resultado de una entrevista: la transcripción se escribe sola cuando la
 * sección entra en pantalla y, al terminar, se llenan la intención de compra y la competencia.
 * Todos los datos son de ejemplo.
 */
@Component({
  selector: 'vc-home-demo',
  styleUrl: './home-demo.component.css',
  templateUrl: './home-demo.component.html',
})
export class HomeDemoComponent {
  /** Líneas de la transcripción de ejemplo. */
  readonly lineas = input.required<LineaTranscripcion[]>();

  protected readonly intencion = INTENCION_EJEMPLO;

  /** Caracteres escritos hasta el momento, sumando todas las líneas. */
  private readonly escritos = signal(0);

  private readonly totalCaracteres = computed(() =>
    this.lineas().reduce((total, linea) => total + linea.texto.length, 0),
  );

  /** La transcripción terminó de escribirse. */
  protected readonly terminado = computed(() => this.escritos() >= this.totalCaracteres());

  /** Texto visible de cada línea según el avance de la escritura. */
  protected readonly lineasVisibles = computed<LineaVisible[]>(() => {
    let restantes = this.escritos();
    return this.lineas().map((linea) => {
      const cantidad = Math.max(0, Math.min(linea.texto.length, restantes));
      restantes -= linea.texto.length;
      return {
        ...linea,
        visible: linea.texto.slice(0, cantidad),
        escribiendo: cantidad > 0 && cantidad < linea.texto.length,
      };
    });
  });

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private temporizador: ReturnType<typeof setInterval> | null = null;

  constructor() {
    afterNextRender(() => this.prepararInicio());
    this.destroyRef.onDestroy(() => this.detener());
  }

  /** Vuelve a reproducir la demostración desde el principio. */
  protected repetir(): void {
    this.escritos.set(0);
    this.escribir();
  }

  /** Inicia la escritura la primera vez que la tarjeta es visible. */
  private prepararInicio(): void {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducido || typeof IntersectionObserver === 'undefined') {
      this.escritos.set(this.totalCaracteres());
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          observador.disconnect();
          this.escribir();
        }
      },
      { threshold: 0.4 },
    );
    observador.observe(this.elemento.nativeElement);
    this.destroyRef.onDestroy(() => observador.disconnect());
  }

  /** Escribe la transcripción carácter por carácter. */
  private escribir(): void {
    this.detener();
    this.temporizador = setInterval(() => {
      if (this.terminado()) {
        this.detener();
        return;
      }
      this.escritos.update((valor) => valor + 1);
    }, VELOCIDAD_ESCRITURA);
  }

  /** Detiene la escritura en curso. */
  private detener(): void {
    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }
}