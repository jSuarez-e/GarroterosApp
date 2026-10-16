/**
 * @sdd
 * [Objetivo]: Guard funcional para restringir acceso a secciones del recorrido (Mapa, Guías, Cómo llegar, SOS) hasta que el excursionista confirme su asistencia y ficha médica.
 * [I/O]: CanActivateFn. Inyecta MedicalService, AuthService, Router y ToastController. Retorna true o UrlTree hacia /medical-registration.
 * [Edge Cases]: Bypass automático para rol ADMIN, resolución asíncrona mediante checkAttendance() y feedback visual con ToastController.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { MedicalService } from '../services/medical.service';
import { AuthService } from '../services/auth.service';

export const attendanceGuard: CanActivateFn = async () => {
  const medicalService = inject(MedicalService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastCtrl = inject(ToastController);

  // Los administradores poseen acceso de supervisión y gestión
  if (authService.isAdmin()) {
    return true;
  }

  try {
    const isConfirmed = await firstValueFrom(medicalService.checkAttendance());

    if (isConfirmed) {
      return true;
    }

    const toast = await toastCtrl.create({
      message: 'Debes validar que estarás en la ruta confirmando tu Ficha Médica para acceder a esta sección.',
      duration: 3500,
      color: 'warning',
      position: 'top',
      icon: 'medkit-outline',
    });
    await toast.present();

    return router.parseUrl('/medical-registration');
  } catch {
    return router.parseUrl('/medical-registration');
  }
};
