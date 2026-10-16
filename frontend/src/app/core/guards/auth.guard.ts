/**
 * @sdd
 * [Objetivo]: Guard funcional para restringir acceso a rutas privadas a usuarios con sesion activa (SDD-002-AUTH-RBAC).
 * [I/O]: CanActivateFn. Valida estado en AuthService. Redirige a /login si no esta autenticado.
 * [Edge Cases]: Verificacion sincrona del token en localStorage si el estado de Signals aun no inicializa.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const hasToken = !!authService.token() || !!localStorage.getItem('guianza_access_token');

  if (hasToken) {
    return true;
  }

  return router.parseUrl('/login');
};
