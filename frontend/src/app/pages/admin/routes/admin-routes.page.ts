/**
 * @sdd
 * [Objetivo]: Panel administrativo para la gestión de rutas turísticas y asignación de guías oficiales (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta RoutesService y GuidesService. Permite listar rutas, crear senderos, asociar guías con selección múltiple y activar el recorrido oficial.
 * [Edge Cases]: Validación de selección de al menos un guía, feedback con toast, control reactivo de modales y recarga de vistas con ionViewWillEnter.
 */

// frontend/src/app/pages/admin/routes/admin-routes.page.ts

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
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonSpinner,
  IonToast,
  IonModal,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  mapOutline,
  peopleOutline,
  addCircleOutline,
  createOutline,
  trashOutline,
  checkmarkCircleOutline,
  timeOutline,
  navigateOutline,
  closeOutline,
  star,
  ribbonOutline,
  refreshOutline,
  checkmarkOutline,
  personAddOutline,
} from 'ionicons/icons';
import { RoutesService } from '../../../core/services/routes.service';
import { GuidesService, type IGuideProfile } from '../../../core/services/guides.service';
import { HeroBannerComponent } from '../../../shared/components';
import type {
  RouteEntityDto,
  CreateRouteDto,
  UpdateRouteDto,
  CreateGuideDto,
} from '../../../../../../shared/src/index';

@Component({
  selector: 'app-admin-routes',
  templateUrl: './admin-routes.page.html',
  styleUrls: ['./admin-routes.page.scss'],
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
    IonIcon,
    IonSpinner,
    IonToast,
    IonModal,
    HeroBannerComponent,
  ],
})
export class AdminRoutesPage implements OnInit, ViewWillEnter {
  private readonly routesService = inject(RoutesService);
  private readonly guidesService = inject(GuidesService);
  private readonly destroyRef = inject(DestroyRef);

  // Señales de datos
  public readonly routes = signal<RouteEntityDto[]>([]);
  public readonly availableGuides = signal<IGuideProfile[]>([]);
  public readonly isLoading = signal<boolean>(true);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  // Modales
  public readonly isRouteModalOpen = signal<boolean>(false);
  public readonly isGuideModalOpen = signal<boolean>(false);
  public readonly editingRouteId = signal<string | null>(null);

  // Formulario de Ruta
  public routeForm = {
    name: '',
    municipality: 'Piedecuesta, Santander',
    description: '',
    totalDistanceKm: 2.1,
    estimatedDurationMinutes: 50,
    isActive: false,
  };
  public selectedGuideIds = signal<string[]>([]);

  // Formulario de Guía
  public guideForm = {
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    bio: '',
    certificationsStr: 'SENA Guianza Turística, Primeros Auxilios WFR',
    experienceYears: 5,
  };

  // Toast
  public toastMessage = signal<string | null>(null);
  public isToastOpen = signal<boolean>(false);

  constructor() {
    addIcons({
      mapOutline,
      peopleOutline,
      addCircleOutline,
      createOutline,
      trashOutline,
      checkmarkCircleOutline,
      timeOutline,
      navigateOutline,
      closeOutline,
      star,
      ribbonOutline,
      refreshOutline,
      checkmarkOutline,
      personAddOutline,
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  ionViewWillEnter(): void {
    this.loadData();
  }

  /**
   * Carga de manera paralela las rutas y los guías disponibles.
   */
  public loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.guidesService
      .getAllGuides()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guides) => this.availableGuides.set(guides),
        error: () => {},
      });

    this.routesService
      .getAllRoutes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (routes) => {
          this.routes.set(routes);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message || 'Error al cargar rutas del sistema');
        },
      });
  }

  /**
   * Abre el modal para crear una nueva ruta turística.
   */
  public openCreateRouteModal(): void {
    this.editingRouteId.set(null);
    this.routeForm = {
      name: '',
      municipality: 'Piedecuesta, Santander',
      description: '',
      totalDistanceKm: 2.1,
      estimatedDurationMinutes: 50,
      isActive: this.routes().length === 0,
    };
    // Por defecto seleccionar todos los guías activos si es la primera ruta
    const activeIds = this.availableGuides().map((g) => g.id);
    this.selectedGuideIds.set(activeIds);
    this.isRouteModalOpen.set(true);
  }

  /**
   * Abre el modal para editar una ruta existente.
   * @param route Ruta seleccionada para editar.
   */
  public openEditRouteModal(route: RouteEntityDto): void {
    this.editingRouteId.set(route.id);
    this.routeForm = {
      name: route.name,
      municipality: route.municipality,
      description: route.description,
      totalDistanceKm: Number(route.totalDistanceKm) || 2.1,
      estimatedDurationMinutes: route.estimatedDurationMinutes || 50,
      isActive: route.isActive,
    };
    const assignedIds = (route.guides || []).map((g) => g.id);
    this.selectedGuideIds.set(assignedIds);
    this.isRouteModalOpen.set(true);
  }

  /**
   * Cierra el modal de formulario de ruta.
   */
  public closeRouteModal(): void {
    this.isRouteModalOpen.set(false);
    this.editingRouteId.set(null);
  }

  /**
   * Alterna la selección de un guía para la ruta.
   * @param guideId Identificador UUID del guía.
   */
  public toggleGuideSelection(guideId: string): void {
    const current = this.selectedGuideIds();
    if (current.includes(guideId)) {
      this.selectedGuideIds.set(current.filter((id) => id !== guideId));
    } else {
      this.selectedGuideIds.set([...current, guideId]);
    }
  }

  /**
   * Verifica si un guía está seleccionado.
   * @param guideId Identificador UUID del guía.
   */
  public isGuideSelected(guideId: string): boolean {
    return this.selectedGuideIds().includes(guideId);
  }

  /**
   * Guarda o actualiza la ruta turística con los guías seleccionados.
   */
  public onSaveRoute(): void {
    if (!this.routeForm.name.trim() || !this.routeForm.description.trim()) {
      this.showToast('El nombre y la descripción de la ruta son obligatorios.');
      return;
    }

    if (this.selectedGuideIds().length === 0) {
      this.showToast('Debes seleccionar al menos un guía oficial para este recorrido.');
      return;
    }

    this.isSubmitting.set(true);

    const editId = this.editingRouteId();
    if (editId) {
      const payload: UpdateRouteDto = {
        name: this.routeForm.name,
        municipality: this.routeForm.municipality,
        description: this.routeForm.description,
        totalDistanceKm: Number(this.routeForm.totalDistanceKm),
        estimatedDurationMinutes: Number(this.routeForm.estimatedDurationMinutes),
        isActive: this.routeForm.isActive,
        guideIds: this.selectedGuideIds(),
      };

      this.routesService
        .updateRoute(editId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeRouteModal();
            this.showToast('Ruta actualizada exitosamente.');
            this.loadData();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.showToast(err?.error?.message || 'Error al actualizar la ruta.');
          },
        });
    } else {
      const payload: CreateRouteDto = {
        name: this.routeForm.name,
        municipality: this.routeForm.municipality,
        description: this.routeForm.description,
        totalDistanceKm: Number(this.routeForm.totalDistanceKm),
        estimatedDurationMinutes: Number(this.routeForm.estimatedDurationMinutes),
        isActive: this.routeForm.isActive,
        guideIds: this.selectedGuideIds(),
      };

      this.routesService
        .createRoute(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeRouteModal();
            this.showToast('Ruta creada con guías asociados exitosamente.');
            this.loadData();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.showToast(err?.error?.message || 'Error al crear la ruta.');
          },
        });
    }
  }

  /**
   * Activa una ruta como la oficial en la aplicación.
   * @param route Ruta a activar.
   */
  public onActivateRoute(route: RouteEntityDto): void {
    this.routesService
      .setActiveRoute(route.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast(`"${route.name}" es ahora el recorrido oficial activo.`);
          this.loadData();
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Error al activar la ruta.');
        },
      });
  }

  /**
   * Elimina una ruta tras confirmación.
   * @param route Ruta a eliminar.
   */
  public onDeleteRoute(route: RouteEntityDto): void {
    if (confirm(`¿Estás seguro de eliminar la ruta "${route.name}"?`)) {
      this.routesService
        .deleteRoute(route.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.showToast('Ruta eliminada.');
            this.loadData();
          },
          error: (err) => {
            this.showToast(err?.error?.message || 'Error al eliminar la ruta.');
          },
        });
    }
  }

  /**
   * Abre el modal para registrar un nuevo guía en el catálogo.
   */
  public openCreateGuideModal(): void {
    this.guideForm = {
      fullName: '',
      email: '',
      phone: '',
      avatarUrl: '',
      bio: '',
      certificationsStr: 'SENA Guianza Turística, Primeros Auxilios WFR',
      experienceYears: 5,
    };
    this.isGuideModalOpen.set(true);
  }

  /**
   * Cierra el modal de registro de guía.
   */
  public closeGuideModal(): void {
    this.isGuideModalOpen.set(false);
  }

  /**
   * Guarda un nuevo guía en la base de datos.
   */
  public onSaveGuide(): void {
    if (!this.guideForm.fullName.trim() || !this.guideForm.email.trim() || !this.guideForm.phone.trim()) {
      this.showToast('Nombre, correo y teléfono son obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    const certs = this.guideForm.certificationsStr
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const payload: CreateGuideDto = {
      fullName: this.guideForm.fullName.trim(),
      email: this.guideForm.email.trim(),
      phone: this.guideForm.phone.trim(),
      avatarUrl: this.guideForm.avatarUrl.trim() || null,
      bio: this.guideForm.bio.trim() || null,
      certifications: certs,
      experienceYears: Number(this.guideForm.experienceYears) || 1,
      rating: 5.0,
      status: 'ACTIVE',
    };

    this.guidesService
      .createGuide(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.closeGuideModal();
          this.showToast(`Guía "${created.fullName}" registrado exitosamente.`);
          // Agregar automáticamente al array de seleccionados si el modal de ruta está abierto
          this.selectedGuideIds.set([...this.selectedGuideIds(), created.id]);
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showToast(err?.error?.message || 'Error al registrar el guía.');
        },
      });
  }

  /**
   * Despliega un mensaje de toast.
   * @param msg Texto a mostrar.
   */
  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    this.isToastOpen.set(true);
  }
}
