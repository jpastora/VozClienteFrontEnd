import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RUTAS } from '../core/rutas';
import { SessionService } from '../services/session';
import { CountUpDirective } from '../shared/directivas/count-up.directive';
import { RevealDirective } from '../shared/directivas/reveal.directive';
import { LogoComponent } from '../shared/logo/logo.component';
import { WaveformComponent } from '../shared/waveform/waveform.component';
import { HomeDemoComponent } from './home-demo/home-demo.component';
import { HomeFuncionalidadesComponent } from './home-funcionalidades/home-funcionalidades.component';
import { HomeNavComponent } from './home-nav/home-nav.component';
import { HomePaquetesComponent } from './home-paquetes/home-paquetes.component';
import { HomePasosComponent } from './home-pasos/home-pasos.component';
import {
  CAPACIDADES,
  CIFRAS,
  ENLACES_SECCION,
  FUNCIONALIDADES,
  PASOS,
  TRANSCRIPCION_DEMO,
} from './home-contenido';

/**
 * Home público de Voz Cliente (Figura 3 del informe de diseño): propuesta de valor, pasos de uso,
 * ejemplo de resultados, funcionalidades y paquetes, con acceso con Google (RF-01, RF-17).
 *
 * Concepto visual «de la voz al dato»: la onda de audio del hero se convierte en barras de
 * métricas a lo largo de la página. Bandas alternas Code Black y Paper, un bloque Deep Circuit
 * y Filament reservado a la onda, una cifra y los botones principales.
 */
@Component({
  imports: [
    CountUpDirective,
    HomeDemoComponent,
    HomeFuncionalidadesComponent,
    HomeNavComponent,
    HomePaquetesComponent,
    HomePasosComponent,
    LogoComponent,
    RevealDirective,
    RouterLink,
    WaveformComponent,
  ],
  selector: 'vc-home-publico',
  styleUrl: './home.component.css',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly sesion = inject(SessionService);

  /** Persona con sesión, si la hay: los botones llevan a su panel en lugar del ingreso. */
  protected readonly usuario = this.sesion.usuario;

  protected readonly rutas = RUTAS;
  protected readonly enlaces = ENLACES_SECCION;
  protected readonly capacidades = CAPACIDADES;
  protected readonly cifras = CIFRAS;
  protected readonly pasos = PASOS;
  protected readonly funcionalidades = FUNCIONALIDADES;
  protected readonly transcripcion = TRANSCRIPCION_DEMO;

  /** Año del pie de página. */
  protected readonly anio = new Date().getFullYear();
}