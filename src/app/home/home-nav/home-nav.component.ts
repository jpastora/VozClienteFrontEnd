import { afterNextRender, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RUTAS } from '../../core/rutas';
import { LogoComponent } from '../../shared/logo/logo.component';
import { EnlaceSeccion } from '../home-contenido';

/** Desplazamiento en px a partir del cual la barra se vuelve sólida. */
const UMBRAL_DESPLAZAMIENTO = 24;

/**
 * Barra de navegación del home: transparente sobre el hero y sólida al desplazarse, con
 * indicador Filament bajo la sección visible y menú desplegable en móvil.
 */
@Component({
  imports: [LogoComponent, RouterLink],
  selector: 'vc-home-nav',
  styleUrl: './home-nav.component.css',
  templateUrl: './home-nav.component.html',
  host: {
    '[class.is-solida]': 'solida() || menuAbierto()',
    '(window:scroll)': 'actualizarFondo()',
    '(document:keydown.escape)': 'cerrarMenu()',
  },
})
export class HomeNavComponent {
  /** Secciones del home a las que lleva la barra. */
  readonly enlaces = input.required<EnlaceSeccion[]>();

  /** Hay una persona con sesión: el botón lleva a su panel en lugar del ingreso. */
  readonly conSesion = input(false);

  protected readonly rutas = RUTAS;
  protected readonly solida = signal(false);
  protected readonly menuAbierto = signal(false);
  protected readonly seccionActiva = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.actualizarFondo();
      this.observarSecciones();
    });
  }

  /** Vuelve sólida la barra cuando la página se desplaza. */
  protected actualizarFondo(): void {
    this.solida.set(window.scrollY > UMBRAL_DESPLAZAMIENTO);
  }

  /** Abre o cierra el menú en móvil. */
  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  /** Cierra el menú (clic en un enlace o tecla Escape). */
  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  /** Marca como activa la sección que ocupa la franja central de la pantalla. */
  private observarSecciones(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            this.seccionActiva.set(entrada.target.id);
          }
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const enlace of this.enlaces()) {
      const seccion = document.getElementById(enlace.id);
      if (seccion) {
        observador.observe(seccion);
      }
    }
    this.destroyRef.onDestroy(() => observador.disconnect());
  }
}