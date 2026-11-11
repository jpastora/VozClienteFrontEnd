import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaqueteDTO } from '../../core/models';
import { PaqueteApi } from '../../core/paquete-api';
import { RUTAS } from '../../core/rutas';
import { RevealDirective } from '../../shared/directivas/reveal.directive';

/**
 * Paquetes de referencia mientras el catálogo público no responde. Coinciden con los datos de
 * prueba V2 del back-end; si GET /api/paquetes/activos responde, se reemplazan por los reales.
 */
const PAQUETES_RESPALDO: PaqueteDTO[] = [
  { id: 1, nombre: 'Paquete Básico 10', cantidadSalas: 10, precio: 150, esActivo: true },
  { id: 2, nombre: 'Paquete Medio 50', cantidadSalas: 50, precio: 600, esActivo: true },
  { id: 3, nombre: 'Paquete Premium 200', cantidadSalas: 200, precio: 2000, esActivo: true },
];

/** Paquete con los datos derivados que muestra la tarjeta. */
interface PaqueteVista extends PaqueteDTO {
  precioPorSala: number;
  recomendado: boolean;
}

/**
 * Catálogo de paquetes del home (RF-17). Muestra los paquetes activos ordenados por cantidad de
 * salas y destaca el del medio con el filete Filament.
 */
@Component({
  imports: [CurrencyPipe, RevealDirective, RouterLink],
  selector: 'vc-home-paquetes',
  styleUrl: './home-paquetes.component.css',
  templateUrl: './home-paquetes.component.html',
})
export class HomePaquetesComponent implements OnInit {
  /** Hay una persona con sesión: las tarjetas llevan a Paquetes y saldo en lugar del ingreso. */
  readonly conSesion = input(false);

  protected readonly rutas = RUTAS;

  /** Los precios vienen de la API (true) o son los de referencia (false). */
  protected readonly datosReales = signal(false);

  private readonly paqueteApi = inject(PaqueteApi);
  private readonly paquetes = signal<PaqueteDTO[]>(PAQUETES_RESPALDO);

  /** Paquetes ordenados, con precio por sala y el recomendado marcado. */
  protected readonly vista = computed<PaqueteVista[]>(() => {
    const ordenados = [...this.paquetes()].sort((a, b) => a.cantidadSalas - b.cantidadSalas);
    const indiceRecomendado = Math.floor(ordenados.length / 2);
    return ordenados.map((paquete, indice) => ({
      ...paquete,
      precioPorSala: paquete.precio / paquete.cantidadSalas,
      recomendado: ordenados.length > 1 && indice === indiceRecomendado,
    }));
  });

  /** Consulta el catálogo; si falla o viene vacío, se quedan los paquetes de referencia. */
  ngOnInit(): void {
    this.paqueteApi.listarActivosPublico().subscribe({
      next: (paquetes) => {
        const activos = paquetes.filter((paquete) => paquete.esActivo && paquete.cantidadSalas > 0);
        if (activos.length > 0) {
          this.paquetes.set(activos);
          this.datosReales.set(true);
        }
      },
      error: () => this.datosReales.set(false),
    });
  }
}