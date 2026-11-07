import { Routes } from '@angular/router';
import { roleGuard } from './guards/role';
import { Shell } from './shell/shell';

/**
 * Un módulo por cada módulo del producto (M1 a M8) y uno público para el consumidor,
 * todos con carga bajo demanda. Los guardas por rol se activan con el login (HU-01).
 */
export const routes: Routes = [
  // Sin sesión
  { path: 'auth', title: 'M1 Autenticación y roles', loadComponent: () => import('./auth/auth').then((m) => m.Auth) },
  { path: 'publico/:token', title: 'Ingreso del consumidor', loadComponent: () => import('./public-room/public-room').then((m) => m.PublicRoom) },
  { path: 'ui', loadComponent: () => import('./ui-demo/ui-demo').then((m) => m.UiDemo) },

  // Videollamada (Eduardo)
  // Enlace que recibe el consumidor: /sala/<token>
  {
    path: 'sala/:token',
    title: 'Videollamada',
    loadComponent: () => import('./videollamada/videollamada').then((m) => m.Videollamada),
    data: { rol: 'consumidor' },
  },
  // Enlace del representante: /representante/<token>?entrevistaId=123
  {
    path: 'representante/:token',
    title: 'Videollamada',
    loadComponent: () => import('./videollamada/videollamada').then((m) => m.Videollamada),
    data: { rol: 'representante' },
  },

  // Con el layout de la aplicación
  {
    path: '',
    component: Shell,
    children: [
      { path: 'productos', title: 'M2 Productos', loadComponent: () => import('./products/products').then((m) => m.Products) },
      { path: 'productos/:id', title: 'M2 Detalle de producto', loadComponent: () => import('./product-detail/product-detail').then((m) => m.ProductDetail) },
      { path: 'salas', title: 'M3 Salas y videollamada', loadComponent: () => import('./rooms/rooms').then((m) => m.Rooms) },
      { path: 'transcripciones', title: 'M4 Transcripción', loadComponent: () => import('./transcription/transcription').then((m) => m.Transcription) },
      { path: 'analisis', title: 'M5 Análisis con IA', loadComponent: () => import('./analysis/analysis').then((m) => m.Analysis) },
      { path: 'reportes', title: 'M6 Estadísticas y reportes', loadComponent: () => import('./reports/reports').then((m) => m.Reports) },
      { path: 'paquetes', title: 'M7 Paquetes y cobros', loadComponent: () => import('./packages/packages').then((m) => m.Packages) },
      { path: 'admin', title: 'M8 Administración', loadComponent: () => import('./admin/admin').then((m) => m.Admin), canActivate: [roleGuard('ADMIN_PLATAFORMA')] },
      { path: '', pathMatch: 'full', redirectTo: 'productos' },
    ],
  },
  { path: '**', redirectTo: '' },
];