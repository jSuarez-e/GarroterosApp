/**
 * @sdd
 * [Objetivo]: Panel administrativo para el CRUD integral de guías turísticos oficiales (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta GuidesService y RoutesService. Permite listar, filtrar, registrar, editar datos/fotos, asignar rutas, alternar estado y eliminar guías.
 * [Edge Cases]: Validación estricta de email/teléfono, fallback reactivo de imágenes rotas, control de estados OnPush y feedback con IonToast.
 */

// frontend/src/app/pages/admin/guides/admin-guides.page.ts

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
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonModal,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  personAddOutline,
  personOutline,
  callOutline,
  mailOutline,
  trashOutline,
  createOutline,
  checkmarkCircleOutline,
  closeOutline,
  star,
  ribbonOutline,
  refreshOutline,
  checkmarkOutline,
  imageOutline,
  timeOutline,
  mapOutline,
  pauseCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { GuidesService } from '../../../core/services/guides.service';
import { RoutesService } from '../../../core/services/routes.service';
import { HeroBannerComponent } from '../../../shared/components';
import type {
  IGuideProfile,
  CreateGuideDto,
  UpdateGuideDto,
  RouteEntityDto,
} from '../../../../../../shared/src/index';

/**
 * Componente standalone del panel administrativo para gestión de guías oficiales.
 */
@Component({
  selector: 'app-admin-guides',
  templateUrl: './admin-guides.page.html',
  styleUrls: ['./admin-guides.page.scss'],
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
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonToast,
    IonModal,
    HeroBannerComponent,
  ],
})
export class AdminGuidesPage implements OnInit, ViewWillEnter {
  private readonly guidesService = inject(GuidesService);
  private readonly routesService = inject(RoutesService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly guides = signal<IGuideProfile[]>([]);
  public readonly routes = signal<RouteEntityDto[]>([]);
  public readonly isLoading = signal<boolean>(true);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly searchQuery = signal<string>('');
  public readonly statusFilter = signal<string>('ALL');

  public readonly isModalOpen = signal<boolean>(false);
  public readonly editingGuideId = signal<string | null>(null);

  // Formulario reactivo
  public formFullName = '';
  public formEmail = '';
  public formPhone = '';
  public formAvatarUrl = '';
  public formBio = '';
  public formCertificationsRaw = '';
  public formExperienceYears = 1;
  public formRating = 5.0;
  public formStatus: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';
  public readonly formSelectedRouteIds = signal<string[]>([]);

  // Notificaciones Toast
  public toastMessage = signal<string | null>(null);
  public isToastOpen = signal<boolean>(false);

  // Avatares predefinidos sugeridos para agilizar la carga de fotos
  public readonly presetAvatars = [
    {
      label: 'Guía Masculino 1',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      label: 'Guía Femenina 1',
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    },
    {
      label: 'Guía Masculino 2',
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
    {
      label: 'Guía Femenina 2',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
  ];

  public readonly filteredGuides = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    return this.guides().filter((guide) => {
      const matchesSearch =
        !query ||
        guide.fullName.toLowerCase().includes(query) ||
        guide.email.toLowerCase().includes(query) ||
        (guide.phone && guide.phone.includes(query));

      const matchesStatus =
        status === 'ALL' || (guide.status ?? 'ACTIVE') === status;

      return matchesSearch && matchesStatus;
    });
  });

  constructor() {
    addIcons({
      peopleOutline,
      personAddOutline,
      personOutline,
      callOutline,
      mailOutline,
      trashOutline,
      createOutline,
      checkmarkCircleOutline,
      closeOutline,
      star,
      ribbonOutline,
      refreshOutline,
      checkmarkOutline,
      imageOutline,
      timeOutline,
      mapOutline,
      pauseCircleOutline,
      alertCircleOutline,
    });
  }

  ngOnInit(): void {
    this.fetchData();
  }

  ionViewWillEnter(): void {
    this.fetchData();
  }

  /**
   * Carga el listado completo de guías y las rutas disponibles para asignación.
   */
  public fetchData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.guidesService
      .getAllGuides()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guidesData) => {
          this.guides.set(guidesData);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'Error al consultar el catálogo de guías.',
          );
          this.isLoading.set(false);
        },
      });

    this.routesService
      .getAllRoutes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (routesData: RouteEntityDto[]) => {
          this.routes.set(routesData);
        },
        error: () => {
          // Rutas secundarias para asignación; no bloquea la pantalla principal
        },
      });
  }

  /**
   * Manejador del campo de búsqueda reactiva.
   * @param event Evento emitido por IonSearchbar.
   */
  public onSearch(event: CustomEvent): void {
    const val = (event.detail as { value?: string }).value ?? '';
    this.searchQuery.set(val);
  }

  /**
   * Filtra guías según su estado operativo.
   * @param event Evento emitido por IonSelect.
   */
  public onStatusFilterChange(event: CustomEvent): void {
    const val = (event.detail as { value?: string }).value ?? 'ALL';
    this.statusFilter.set(val);
  }

  /**
   * Abre el modal para registrar un nuevo guía turístico.
   */
  public openCreateModal(): void {
    this.editingGuideId.set(null);
    this.formFullName = '';
    this.formEmail = '';
    this.formPhone = '';
    this.formAvatarUrl = this.presetAvatars[0].url;
    this.formBio = '';
    this.formCertificationsRaw = 'SENA Guianza Turística, Primeros Auxilios';
    this.formExperienceYears = 2;
    this.formRating = 5.0;
    this.formStatus = 'ACTIVE';
    this.formSelectedRouteIds.set([]);
    this.isModalOpen.set(true);
  }

  /**
   * Abre el modal para editar toda la información de un guía existente.
   * @param guide Perfil del guía a editar.
   */
  public openEditModal(guide: IGuideProfile): void {
    this.editingGuideId.set(guide.id);
    this.formFullName = guide.fullName;
    this.formEmail = guide.email;
    this.formPhone = guide.phone ?? '';
    this.formAvatarUrl = guide.avatarUrl ?? '';
    this.formBio = guide.bio ?? '';
    this.formCertificationsRaw = (guide.certifications || []).join(', ');
    this.formExperienceYears = guide.experienceYears ?? 1;
    this.formRating = Number(guide.rating) || 5.0;
    this.formStatus = guide.status ?? 'ACTIVE';

    const routeIds = (guide.routes || []).map((r) => r.id);
    this.formSelectedRouteIds.set(routeIds);
    this.isModalOpen.set(true);
  }

  /**
   * Cierra el modal de creación/edición.
   */
  public closeModal(): void {
    this.isModalOpen.set(false);
    this.editingGuideId.set(null);
  }

  /**
   * Aplica un avatar sugerido de alta calidad al formulario.
   * @param url Enlace de la fotografía seleccionada.
   */
  public onSelectPresetAvatar(url: string): void {
    this.formAvatarUrl = url;
  }

  /**
   * Alterna la asignación de una ruta para el guía en edición.
   * @param routeId Identificador UUID de la ruta.
   */
  public toggleRouteSelection(routeId: string): void {
    const current = this.formSelectedRouteIds();
    if (current.includes(routeId)) {
      this.formSelectedRouteIds.set(current.filter((id) => id !== routeId));
    } else {
      this.formSelectedRouteIds.set([...current, routeId]);
    }
  }

  /**
   * Comprueba si una ruta está seleccionada para el guía.
   * @param routeId Identificador UUID de la ruta.
   * @returns Verdadero si está seleccionada.
   */
  public isRouteSelected(routeId: string): boolean {
    return this.formSelectedRouteIds().includes(routeId);
  }

  /**
   * Guarda o actualiza los datos del guía en la base de datos.
   */
  public onSaveGuide(): void {
    if (!this.formFullName.trim()) {
      this.showToast('El nombre completo del guía es obligatorio.');
      return;
    }

    if (!this.formEmail.trim() || !this.formEmail.includes('@')) {
      this.showToast('Ingresa un correo electrónico válido.');
      return;
    }

    if (!this.formPhone.trim()) {
      this.showToast('El teléfono de contacto es obligatorio.');
      return;
    }

    const certifications = this.formCertificationsRaw
      .split(/[,;\n]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    this.isSubmitting.set(true);

    const guideId = this.editingGuideId();
    if (guideId) {
      // Actualización
      const payload: UpdateGuideDto = {
        fullName: this.formFullName.trim(),
        email: this.formEmail.trim().toLowerCase(),
        phone: this.formPhone.trim(),
        avatarUrl: this.formAvatarUrl.trim() || null,
        bio: this.formBio.trim() || null,
        certifications,
        experienceYears: Number(this.formExperienceYears) || 1,
        rating: Number(this.formRating) || 5.0,
        status: this.formStatus,
        routeIds: this.formSelectedRouteIds(),
      };

      this.guidesService
        .updateGuide(guideId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeModal();
            this.showToast('Información del guía actualizada exitosamente.');
            this.fetchData();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.showToast(err?.error?.message || 'Error al actualizar el guía.');
          },
        });
    } else {
      // Creación
      const payload: CreateGuideDto = {
        fullName: this.formFullName.trim(),
        email: this.formEmail.trim().toLowerCase(),
        phone: this.formPhone.trim(),
        avatarUrl: this.formAvatarUrl.trim() || null,
        bio: this.formBio.trim() || null,
        certifications,
        experienceYears: Number(this.formExperienceYears) || 1,
        rating: Number(this.formRating) || 5.0,
        status: this.formStatus,
        routeIds: this.formSelectedRouteIds(),
      };

      this.guidesService
        .createGuide(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeModal();
            this.showToast('Nuevo guía turístico registrado exitosamente.');
            this.fetchData();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.showToast(err?.error?.message || 'Error al registrar el guía.');
          },
        });
    }
  }

  /**
   * Alterna de forma rápida el estado operativo (Activo/Inactivo) de un guía.
   * @param guide Guía cuyo estado se alternará.
   */
  public onToggleStatus(guide: IGuideProfile): void {
    const nextStatus: 'ACTIVE' | 'INACTIVE' =
      guide.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.guidesService
      .updateGuide(guide.id, { status: nextStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast(
            `Guía "${guide.fullName}" marcado como ${nextStatus === 'ACTIVE' ? 'Activo' : 'Inactivo'}.`,
          );
          this.fetchData();
        },
        error: (err) => {
          this.showToast(
            err?.error?.message || 'Error al cambiar el estado del guía.',
          );
        },
      });
  }

  /**
   * Elimina un guía del sistema tras confirmación del administrador.
   * @param guide Perfil del guía a remover.
   */
  public onDeleteGuide(guide: IGuideProfile): void {
    if (confirm(`¿Estás seguro de eliminar al guía oficial "${guide.fullName}"?`)) {
      this.guidesService
        .deleteGuide(guide.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.showToast('Guía eliminado exitosamente.');
            this.fetchData();
          },
          error: (err) => {
            this.showToast(err?.error?.message || 'Error al eliminar el guía.');
          },
        });
    }
  }

  /**
   * Proporciona un fallback visual en caso de que la URL de la imagen esté rota o no cargue.
   * @param event Evento de error en etiqueta img.
   */
  public onAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src =
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    }
  }

  /**
   * Emite un mensaje toast de retroalimentación.
   * @param message Texto del toast.
   */
  public showToast(message: string): void {
    this.toastMessage.set(message);
    this.isToastOpen.set(true);
  }
}
