/**
 * @sdd
 * [Objetivo]: Guard funcional para restringir rutas administrativas exclusivamente al rol ADMIN (SDD-002-AUTH-RBAC).
 * [I/O]: CanActivateFn. Valida authService.isAdmin(). Redirige a /home si no posee el rol ADMIN.
 * [Edge Cases]: Redirecciona a /login si no hay sesion activa, o a /home si el rol es USER.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const roleGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();

  if (!currentUser) {
    return router.parseUrl('/login');
  }

  if (currentUser.role === UserRole.ADMIN) {
    return true;
  }

  return router.parseUrl('/home');
};
