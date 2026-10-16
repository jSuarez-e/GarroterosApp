/**
 * @sdd
 * [Objetivo]: Interceptor funcional para adjuntar token JWT Bearer a peticiones salientes (SDD-002-AUTH-RBAC).
 * [I/O]: Entrada: HttpRequest saliente. Salida: HttpRequest clonada con cabecera Authorization Bearer si existe sesion.
 * [Edge Cases]: Excluye peticiones al endpoint de autenticacion (/auth/login) y peticiones anonimas sin token en storage.
 */

import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Adjunta la cabecera Bearer token a la petición HTTP.
 * @param req Petición HTTP saliente.
 * @param token Token JWT activo.
 * @returns Petición clonada con cabecera Authorization.
 */
function attachToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const toastCtrl = inject(ToastController);
  const token = localStorage.getItem('guianza_access_token');

  let authReq = req;
  const isAuthEndpoint =
    req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  if (token && !isAuthEndpoint) {
    authReq = attachToken(req, token);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((response) => {
              isRefreshing = false;
              refreshTokenSubject.next(response.accessToken);
              return next(attachToken(req, response.accessToken));
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              refreshTokenSubject.next(null);

              void (async () => {
                const toast = await toastCtrl.create({
                  message: 'Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.',
                  duration: 4000,
                  color: 'warning',
                  position: 'top',
                });
                await toast.present();
              })();

              authService.logout();
              return throwError(() => refreshErr);
            }),
          );
        } else {
          return refreshTokenSubject.pipe(
            filter((newToken): newToken is string => newToken !== null),
            take(1),
            switchMap((newToken) => next(attachToken(req, newToken))),
          );
        }
      }

      return throwError(() => error);
    }),
  );
};