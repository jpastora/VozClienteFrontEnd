import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, roleGuard } from './guards/role';
import { rutaInicio, SessionService } from './services/session';
import { Shell } from './shell/shell';

/**
 * Un módulo por cada módulo del producto (M1 a M8) y uno público para el consumidor,
 * todos con carga bajo demanda. Las guardas por rol ordenan la navegación por perfil (HU-01);
 * el back-end sigue validando el permiso en cada endpoint.
 */
export const routes: Routes = [
  // Sin sesión
  {
    path: 'auth',
    title: 'Ingresar · Voz Cliente',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./auth/auth').then((m) => m.Auth),
  },
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
    canActivate: [autenticadoGuard],
    children: [
      { path: 'productos', title: 'M2 Productos', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR')], loadComponent: () => import('./products/products').then((m) => m.Products) },
      { path: 'productos/:id', title: 'M2 Detalle de producto', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR')], loadComponent: () => import('./product-detail/product-detail').then((m) => m.ProductDetail) },
      { path: 'salas', title: 'M3 Salas y videollamada', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR', 'REPRESENTANTE')], loadComponent: () => import('./rooms/rooms').then((m) => m.Rooms) },
      { path: 'transcripciones', title: 'M4 Transcripción', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR')], loadComponent: () => import('./transcription/transcription').then((m) => m.Transcription) },
      { path: 'entrevistas', title: 'Entrevistas y procesamiento', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR')], loadComponent: () => import('./interviews/interviews').then((m) => m.Interviews),},
      { path: 'entrevistas/:id', title: 'Detalle de entrevista', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR')], loadComponent: () => import('./interview-detail/interview-detail').then(  (m) => m.InterviewDetail ),},
      { path: 'analisis', title: 'M5 Análisis con IA', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR')], loadComponent: () => import('./analysis/analysis').then((m) => m.Analysis) },
      { path: 'reportes', title: 'M6 Estadísticas y reportes', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR')], loadComponent: () => import('./reports/reports').then((m) => m.Reports) },
      { path: 'paquetes', title: 'M7 Paquetes y cobros', canActivate: [roleGuard('CLIENTE_ADMINISTRADOR', 'ADMINISTRADOR')], loadComponent: () => import('./packages/packages').then((m) => m.Packages) },
      { path: 'admin', title: 'M8 Administración', canActivate: [roleGuard('ADMINISTRADOR')], loadComponent: () => import('./admin/admin').then((m) => m.Admin) },
      // Cada perfil entra a su propia pantalla de inicio.
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const usuario = inject(SessionService).usuario();
          return usuario ? rutaInicio(usuario.rol) : '/auth';
        },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];