/**
 * @sdd
 * [Objetivo]: Definicion de rutas del cliente Ionic/Angular con proteccion RBAC (SDD-002-AUTH-RBAC).
 * [I/O]: Enrutador con guards funcionales authGuard y roleGuard.
 * [Edge Cases]: Redirecciones seguras para usuarios no autenticados o con rol no privilegiado.
 */

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { attendanceGuard } from './core/guards/attendance.guard';

export const routes: Routes = [
  {
    path: 'splash',
    loadComponent: () =>
      import('./pages/splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    canActivate: [authGuard, attendanceGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'how-to-arrive',
    canActivate: [authGuard, attendanceGuard],
    loadComponent: () =>
      import('./pages/how-to-arrive/how-to-arrive.page').then(
        (m) => m.HowToArrivePage,
      ),
  },
  {
    path: 'map',
    canActivate: [authGuard, attendanceGuard],
    loadComponent: () =>
      import('./pages/map/map.page').then((m) => m.MapPage),
  },
  {
    path: 'routes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/route-info/route-info.page').then((m) => m.RouteInfoPage),
  },
  {
    path: 'route-info',
    redirectTo: 'routes',
    pathMatch: 'full',
  },
  {
    path: 'weather',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/weather/weather.page').then((m) => m.WeatherPage),
  },
  {
    path: 'sos',
    canActivate: [authGuard, attendanceGuard],
    loadComponent: () =>
      import('./pages/sos/sos.page').then((m) => m.SosPage),
  },
  {
    path: 'assistance',
    redirectTo: 'sos',
    pathMatch: 'full',
  },
  {
    path: 'medical-registration',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/medical-registration/medical-registration.page').then(
        (m) => m.MedicalRegistrationPage,
      ),
  },
  {
    path: 'medical-card',
    redirectTo: 'medical-registration',
    pathMatch: 'full',
  },
  {
    path: 'guides',
    canActivate: [authGuard, attendanceGuard],
    loadComponent: () =>
      import('./pages/guides/guides.page').then((m) => m.GuidesPage),
  },
  {
    path: 'permissions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/permissions/permissions.page').then(
        (m) => m.PermissionsPage,
      ),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    children: [
      {
        path: 'routes-users',
        loadComponent: () =>
          import('./pages/admin/routes-users/admin-routes-users.page').then(
            (m) => m.AdminRoutesUsersPage,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/admin-users.page').then(
            (m) => m.AdminUsersPage,
          ),
      },
      {
        path: 'guides',
        loadComponent: () =>
          import('./pages/admin/guides/admin-guides.page').then(
            (m) => m.AdminGuidesPage,
          ),
      },
      {
        path: 'itinerary',
        loadComponent: () =>
          import('./pages/admin/log/admin-log.page').then(
            (m) => m.AdminLogPage,
          ),
      },
      {
        path: 'log',
        redirectTo: 'itinerary',
        pathMatch: 'full',
      },
      {
        path: 'notes',
        loadComponent: () =>
          import('./pages/admin/notes/admin-notes.page').then(
            (m) => m.AdminNotesPage,
          ),
      },
      {
        path: 'pois',
        loadComponent: () =>
          import('./pages/admin/pois/admin-pois.page').then(
            (m) => m.AdminPoisPage,
          ),
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./pages/admin/alerts/admin-alerts.page').then(
            (m) => m.AdminAlertsPage,
          ),
      },
      {
        path: 'routes',
        loadComponent: () =>
          import('./pages/admin/routes/admin-routes.page').then(
            (m) => m.AdminRoutesPage,
          ),
      },
    ],
  },
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'splash',
  },
];
