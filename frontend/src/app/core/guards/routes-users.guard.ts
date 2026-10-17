/**
 * @sdd
 * [Objetivo]: Guard funcional para restringir el acceso a la sección de Rutas y Usuarios exclusivamente a roles ADMIN y GUIDE (SDD-005).
 * [I/O]: CanActivateFn. Inyecta AuthService y Router. Permite acceso si el rol es ADMIN o GUIDE, o redirige a /home.
 * [Edge Cases]: Redirige a /login si no hay sesión activa; previene acceso a usuarios estándar (USER).
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const routesUsersGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();

  if (!currentUser) {
    return router.parseUrl('/login');
  }

  if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.GUIDE) {
    return true;
  }

  return router.parseUrl('/home');
};
