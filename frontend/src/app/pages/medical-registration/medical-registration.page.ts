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
  computed,
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
  ViewWillEnter,
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
  cameraOutline,
  trashOutline,
  imageOutline,
  trailSignOutline,
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
export class MedicalRegistrationPage implements OnInit, ViewWillEnter {
  private readonly medicalService = inject(MedicalService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly currentUser = this.authService.currentUser;
  public readonly isLoading = signal<boolean>(true);
  public readonly isSaving = signal<boolean>(false);
  public readonly isProcessingPhoto = signal<boolean>(false);
  public readonly showToast = signal<boolean>(false);
  public readonly toastMessage = signal<string>('');

  /**
   * Resumen de la ruta turística activa asignada al usuario o a su ficha médica.
   */
  public readonly assignedRoute = computed(() => {
    return this.currentUser()?.route || this.medicalService.profile()?.route || null;
  });

  // Form Model con Signals
  public readonly attendanceConfirmed = signal<boolean>(true);
  public readonly photoUrl = signal<string | null>(null);
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
      cameraOutline,
      trashOutline,
      imageOutline,
      trailSignOutline,
    });
  }

  public ngOnInit(): void {
    this.refreshUserData();
  }

  public ionViewWillEnter(): void {
    this.refreshUserData();
  }

  /**
   * Sincroniza el perfil del usuario autenticado y carga la ficha médica existente.
   */
  private refreshUserData(): void {
    this.authService
      .refreshProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadProfile(),
        error: () => this.loadProfile(),
      });
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
            this.photoUrl.set(profile.photoUrl || null);
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Procesa la selección de una fotografía del usuario, comprimiéndola en el cliente
   * vía HTML5 Canvas para optimizar el tamaño de transferencia y almacenamiento.
   * @param event Evento change del input file.
   */
  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.toastMessage.set('Por favor selecciona un archivo de imagen válido.');
      this.showToast.set(true);
      return;
    }

    this.isProcessingPhoto.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 800;
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          this.photoUrl.set(compressedDataUrl);
        }
        this.isProcessingPhoto.set(false);
      };
      img.onerror = () => {
        this.isProcessingPhoto.set(false);
        this.toastMessage.set('No se pudo procesar la imagen seleccionada.');
        this.showToast.set(true);
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      this.isProcessingPhoto.set(false);
      this.toastMessage.set('Error al leer el archivo seleccionado.');
      this.showToast.set(true);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  /**
   * Remueve la fotografía actual de la ficha médica.
   */
  public onRemovePhoto(): void {
    this.photoUrl.set(null);
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
    const assignedRouteId = this.currentUser()?.routeId || this.assignedRoute()?.id || null;
    const dto: SaveMedicalProfileDto = {
      attendanceConfirmed: this.attendanceConfirmed(),
      routeId: assignedRouteId,
      medicalConditions: this.medicalConditions() || null,
      allergies: this.allergies() || null,
      medications: this.medications() || null,
      dietType: this.dietType(),
      emergencyContactName: this.emergencyContactName() || null,
      emergencyContactPhone: this.emergencyContactPhone() || null,
      bloodType: this.bloodType() || null,
      notes: this.notes() || null,
      photoUrl: this.photoUrl() || null,
    };

    this.medicalService
      .saveMyProfile(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          if (dto.photoUrl !== undefined) {
            this.authService.updateCurrentUserAvatar(dto.photoUrl);
          }
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
