import { Routes } from '@angular/router';
import { Videollamada } from './videollamada/videollamada';
import { Inicio } from './inicio';

export const routes: Routes = [
  // Enlace que recibe el consumidor: /sala/<token>
  { path: 'sala/:token', component: Videollamada, data: { rol: 'consumidor' } },
  // Enlace del representante: /representante/<token>?entrevistaId=123
  { path: 'representante/:token', component: Videollamada, data: { rol: 'representante' } },
  { path: '**', component: Inicio },
];
