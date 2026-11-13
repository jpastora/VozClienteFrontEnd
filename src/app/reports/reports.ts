import { Component } from '@angular/core';
import { Button } from '../button/button';
import { MetricCard } from '../metric-card/metric-card';

/**
 * Estadísticas por producto (prototipo "Estadísticas por producto").
 * Solo estructura visual: el back-end aún no expone estadísticas ni reporte en PDF.
 */
@Component({
  imports: [Button, MetricCard],
  selector: 'vc-reports',
  styleUrl: './reports.css',
  templateUrl: './reports.html',
})
export class Reports {}
