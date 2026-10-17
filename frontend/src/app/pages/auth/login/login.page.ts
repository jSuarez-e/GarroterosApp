/**
 * @sdd
 * [Objetivo]: Pagina de inicio de sesion estricto con Reactive Forms y control de errores RBAC (SDD-002-AUTH-RBAC).
 * [I/O]: Inputs del formulario (email, password). Ejecuta authService.login() y navega a /home.
 * [Edge Cases]: Zero auto-registration, bloqueo de envio si el formulario es invalido, mensajes toast diferenciados.
 */

import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  lockClosedOutline,
  logInOutline,
  trailSignOutline,
} from 'ionicons/icons';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalService } from '../../../core/services/medical.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class LoginPage implements ViewWillEnter {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly medicalService = inject(MedicalService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  public isLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    addIcons({
      mailOutline,
      lockClosedOutline,
      logInOutline,
      trailSignOutline,
    });
  }

  /**
   * Ciclo de vida Ionic ejecutado cada vez que la vista entra en pantalla.
   * Limpia los campos del formulario para evitar que persistan credenciales anteriores.
   */
  public ionViewWillEnter(): void {
    this.resetForm();
  }

  /**
   * Restablece el estado del formulario de login y sus señales reactivas.
   */
  private resetForm(): void {
    this.loginForm.reset({ email: '', password: '' });
    this.loginForm.markAsPristine();
    this.loginForm.markAsUntouched();
    this.errorMessage.set(null);
    this.isLoading.set(false);
  }

  /**
   * Procesa el envio del formulario de inicio de sesion.
   */
  public async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value as { email: string; password: string };

    this.authService
      .login({ email, password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: async () => {
        this.isLoading.set(false);
        this.resetForm();
        const toast = await this.toastCtrl.create({
          message: 'Bienvenido a la Ruta Turística Piedecuesta',
          duration: 2500,
          color: 'success',
          position: 'top',
        });
        await toast.present();

        if (this.authService.isAdmin()) {
          void this.router.navigate(['/home']);
          return;
        }

        try {
          const isConfirmed = await firstValueFrom(this.medicalService.checkAttendance());
          if (isConfirmed) {
            void this.router.navigate(['/home']);
          } else {
            void this.router.navigate(['/medical-registration']);
          }
        } catch {
          void this.router.navigate(['/medical-registration']);
        }
      },
      error: async (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        let message = 'Error de conexión. Intente nuevamente.';

        if (error.status === 401) {
          message = 'Credenciales inválidas';
        } else if (error.status === 403) {
          message = 'Cuenta suspendida o inactiva';
        } else if (error.status === 400) {
          message = 'Por favor verifique los campos ingresados.';
        }

        this.errorMessage.set(message);

        const toast = await this.toastCtrl.create({
          message,
          duration: 3500,
          color: 'danger',
          position: 'top',
        });
        await toast.present();
      },
    });
  }
}
