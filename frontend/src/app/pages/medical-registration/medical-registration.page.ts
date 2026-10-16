/**
 * @sdd
 * [Objetivo]: Página de registro y ficha médica del excursionista con confirmación de asistencia (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Consume MedicalService y AuthService. Expone formulario reactivo con Signals para condiciones médicas, dieta y contactos.
 * [Edge Cases]: Carga inicial segura de ficha existente, feedback visual ante guardado exitoso o errores de red.
 */

// frontend/src/app/pages/medical-registration/medical-registration.page.ts

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonToast,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  medkitOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  personOutline,
  callOutline,
  restaurantOutline,
  saveOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import {
  MedicalService,
  DietType,
  SaveMedicalProfileDto,
} from '../../core/services/medical.service';
import { AuthService } from '../../core/services/auth.service';
import {
  HeroBannerComponent,
  InfoCardComponent,
} from '../../shared/components';

@Component({
  selector: 'app-medical-registration',
  templateUrl: './medical-registration.page.html',
  styleUrls: ['./medical-registration.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonToast,
    IonSelect,
    IonSelectOption,
    IonToggle,
    HeroBannerComponent,
    InfoCardComponent,
  ],
})
export class MedicalRegistrationPage implements OnInit {
  private readonly medicalService = inject(MedicalService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly currentUser = this.authService.currentUser;
  public readonly isLoading = signal<boolean>(true);
  public readonly isSaving = signal<boolean>(false);
  public readonly showToast = signal<boolean>(false);
  public readonly toastMessage = signal<string>('');

  // Form Model con Signals
  public readonly attendanceConfirmed = signal<boolean>(true);
  public readonly medicalConditions = signal<string>('');
  public readonly allergies = signal<string>('');
  public readonly medications = signal<string>('');
  public readonly dietType = signal<DietType>(DietType.REGULAR);
  public readonly emergencyContactName = signal<string>('');
  public readonly emergencyContactPhone = signal<string>('');
  public readonly bloodType = signal<string>('O+');
  public readonly notes = signal<string>('');

  public readonly dietOptions = [
    { label: 'Regular / Estándar', value: DietType.REGULAR },
    { label: 'Vegetariana', value: DietType.VEGETARIAN },
    { label: 'Vegana', value: DietType.VEGAN },
    { label: 'Celíaca / Sin Gluten', value: DietType.CELIAC },
    { label: 'Otra restricción', value: DietType.OTHER },
  ];

  public readonly bloodTypeOptions = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  constructor() {
    addIcons({
      medkitOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      personOutline,
      callOutline,
      restaurantOutline,
      saveOutline,
      shieldCheckmarkOutline,
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  /**
   * Carga la ficha médica actual del usuario si ya fue registrada previamente.
   */
  public loadProfile(): void {
    this.isLoading.set(true);
    this.medicalService
      .getMyProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          if (profile) {
            this.attendanceConfirmed.set(profile.attendanceConfirmed);
            this.medicalConditions.set(profile.medicalConditions || '');
            this.allergies.set(profile.allergies || '');
            this.medications.set(profile.medications || '');
            this.dietType.set(profile.dietType || DietType.REGULAR);
            this.emergencyContactName.set(profile.emergencyContactName || '');
            this.emergencyContactPhone.set(profile.emergencyContactPhone || '');
            this.bloodType.set(profile.bloodType || 'O+');
            this.notes.set(profile.notes || '');
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Actualiza el valor de un campo de texto de forma tipada sin usar any.
   * @param targetSignal Señal writable a actualizar.
   * @param event Evento de entrada de input.
   */
  public onInputChange(targetSignal: { set: (val: string) => void }, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      targetSignal.set(input.value);
    }
  }

  /**
   * Actualiza el valor de un campo textarea de forma tipada.
   * @param targetSignal Señal writable a actualizar.
   * @param event Evento de entrada de textarea.
   */
  public onTextAreaChange(targetSignal: { set: (val: string) => void }, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) {
      targetSignal.set(textarea.value);
    }
  }

  /**
   * Guarda los datos de asistencia y ficha médica en el backend.
   */
  public onSave(): void {
    this.isSaving.set(true);
    const dto: SaveMedicalProfileDto = {
      attendanceConfirmed: this.attendanceConfirmed(),
      medicalConditions: this.medicalConditions() || null,
      allergies: this.allergies() || null,
      medications: this.medications() || null,
      dietType: this.dietType(),
      emergencyContactName: this.emergencyContactName() || null,
      emergencyContactPhone: this.emergencyContactPhone() || null,
      bloodType: this.bloodType() || null,
      notes: this.notes() || null,
    };

    this.medicalService
      .saveMyProfile(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          const isConfirmed = this.attendanceConfirmed();
          if (isConfirmed) {
            this.toastMessage.set('¡Asistencia confirmada! Ahora tienes acceso al mapa y herramientas del recorrido.');
          } else {
            this.toastMessage.set('Ficha médica guardada. Recuerda confirmar asistencia para acceder al mapa.');
          }
          this.showToast.set(true);

          if (isConfirmed) {
            setTimeout(() => {
              void this.router.navigate(['/home']);
            }, 1200);
          }
        },
        error: () => {
          this.isSaving.set(false);
          this.toastMessage.set('Error al guardar la información. Intenta de nuevo.');
          this.showToast.set(true);
        },
      });
  }
}
