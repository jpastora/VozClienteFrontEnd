import { Component } from '@angular/core';
import { MetricCard } from './metric-card/metric-card';

/**
 * Inicio del cliente-administrador (prototipo "Panel del cliente-administrador").
 * Solo estructura visual: el back-end aún no expone saldo, entrevistas recientes ni intención global.
 */
@Component({
  imports: [MetricCard],
  selector: 'vc-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {}
