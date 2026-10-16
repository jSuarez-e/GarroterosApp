/**
 * @sdd
 * [Objetivo]: Interceptor funcional para captura reactiva de fallas de conectividad de red y notificaciones toast al usuario.
 * [I/O]: Entrada: HttpRequest y HttpHandlerFn. Salida: Observable con manejo de errores y re-lanzamiento seguro.
 * [Edge Cases]: Captura status === 0 (perdida de conexion / red inaccesible) mostrando toast de advertencia sin interrumpir el pipe.
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { catchError, throwError } from 'rxjs';

export const networkErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastCtrl = inject(ToastController);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        void (async () => {
          const toast = await toastCtrl.create({
            message: 'Sin conexión con el servidor. Verifique sus datos móviles.',
            duration: 3500,
            color: 'warning',
            position: 'top',
          });
          await toast.present();
        })();
      }
      return throwError(() => error);
    })
  );
};