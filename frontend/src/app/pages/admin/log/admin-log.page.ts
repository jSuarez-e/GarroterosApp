/**
 * @sdd
 * [Objetivo]: Panel administrativo para la bitácora e itinerario cronológico de la ruta turística (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta AdminService. Permite listar hitos, registrar marcas de tiempo operativas, actualizar estados y crear nuevos hitos.
 * [Edge Cases]: Validación de formato de hora (HH:mm), orden secuencial e integración con modal reactivo.
 */

// frontend/src/app/pages/admin/log/admin-log.page.ts

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
  IonButton,
  IonIcon,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonModal,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  addCircleOutline,
  timeOutline,
  checkmarkDoneOutline,
  hourglassOutline,
  alertCircleOutline,
  closeOutline,
  trashOutline,
  createOutline,
  flagOutline,
} from 'ionicons/icons';
import {
  AdminService,
  IRouteLogEntry,
  ItineraryStatus,
  CreateRouteLogEntryDto,
  UpdateRouteLogEntryDto,
} from '../../../core/services/admin.service';
import {
  HeroBannerComponent,
  RouteSelectorComponent,
} from '../../../shared/components';
import type { RouteEntityDto } from '../../../../../../shared/src/index';

@Component({
  selector: 'app-admin-log',
  templateUrl: './admin-log.page.html',
  styleUrls: ['./admin-log.page.scss'],
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
    IonSelect,
    IonSelectOption,
    IonToast,
    IonModal,
    HeroBannerComponent,
    RouteSelectorComponent,
  ],
})
export class AdminLogPage implements OnInit, ViewWillEnter {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly ItineraryStatus = ItineraryStatus;
  public readonly entries = signal<IRouteLogEntry[]>([]);
  public readonly selectedRouteId = signal<string | null>(null);
  public readonly selectedRouteName = signal<string>('');
  public readonly isLoading = signal<boolean>(true);
  public readonly isSubmitting = signal<boolean>(false);

  public readonly isModalOpen = signal<boolean>(false);
  public readonly editingEntry = signal<IRouteLogEntry | null>(null);

  // Form Fields
  public readonly formTitle = signal<string>('');
  public readonly formOrderIndex = signal<number>(1);
  public readonly formPlannedTime = signal<string>('08:00');
  public readonly formActualTime = signal<string>('');
  public readonly formStatus = signal<ItineraryStatus>(ItineraryStatus.PENDING);
  public readonly formNotes = signal<string>('');

  public readonly showToast = signal<boolean>(false);
  public readonly toastMessage = signal<string>('');

  constructor() {
    addIcons({
      calendarOutline,
      addCircleOutline,
      timeOutline,
      checkmarkDoneOutline,
      hourglassOutline,
      alertCircleOutline,
      closeOutline,
      trashOutline,
      createOutline,
      flagOutline,
    });
  }

  ngOnInit(): void {
    this.fetchEntries();
  }

  /**
   * Refresca la lista de hitos al ingresar a la vista.
   */
  ionViewWillEnter(): void {
    this.fetchEntries();
  }

  /**
   * Reacciona al cambio de ruta seleccionada en el selector universal.
   * @param route Ruta seleccionada.
   */
  public onRouteChanged(route: RouteEntityDto): void {
    this.selectedRouteId.set(route.id);
    this.selectedRouteName.set(route.name);
    this.fetchEntries(route.id);
  }

  /**
   * Obtiene la secuencia de hitos cronológicos desde el backend, opcionalmente filtrados por ruta.
   * @param routeId Identificador opcional de la ruta.
   */
  public fetchEntries(routeId?: string | null): void {
    const targetRouteId = routeId !== undefined ? (routeId || undefined) : (this.selectedRouteId() || undefined);
    this.isLoading.set(true);
    this.adminService
      .getLogEntries(targetRouteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.entries.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Abre el modal para añadir un nuevo hito al itinerario.
   */
  public openCreateModal(): void {
    this.editingEntry.set(null);
    this.formTitle.set('');
    this.formOrderIndex.set(this.entries().length + 1);
    this.formPlannedTime.set('08:00');
    this.formActualTime.set('');
    this.formStatus.set(ItineraryStatus.PENDING);
    this.formNotes.set('');
    this.isModalOpen.set(true);
  }

  /**
   * Abre el modal para editar un hito existente.
   * @param entry Hito a editar.
   */
  public openEditModal(entry: IRouteLogEntry): void {
    this.editingEntry.set(entry);
    this.formTitle.set(entry.title);
    this.formOrderIndex.set(entry.orderIndex);
    this.formPlannedTime.set(entry.plannedTime);
    this.formActualTime.set(entry.actualTime || '');
    this.formStatus.set(entry.status);
    this.formNotes.set(entry.notes || '');
    this.isModalOpen.set(true);
  }

  /**
   * Cierra el modal.
   */
  public closeModal(): void {
    this.isModalOpen.set(false);
  }

  /**
   * Actualiza el valor del orden secuencial de forma tipada.
   * @param event Evento del input numerico.
   */
  public onOrderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.formOrderIndex.set(Number(input.value) || 1);
    }
  }

  /**
   * Actualiza campo de texto de forma tipada.
   * @param targetSignal Señal a modificar.
   * @param event Evento del input.
   */
  public onInputChange(targetSignal: { set: (val: string) => void }, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) targetSignal.set(input.value);
  }

  /**
   * Guarda o actualiza el hito del itinerario.
   */
  public onSave(): void {
    if (!this.formTitle().trim()) {
      this.toastMessage.set('El título del hito es obligatorio.');
      this.showToast.set(true);
      return;
    }

    this.isSubmitting.set(true);
    const editing = this.editingEntry();

    if (editing) {
      const dto: UpdateRouteLogEntryDto = {
        routeId: editing.routeId || this.selectedRouteId() || null,
        title: this.formTitle().trim(),
        orderIndex: Number(this.formOrderIndex()),
        plannedTime: this.formPlannedTime().trim(),
        actualTime: this.formActualTime().trim() || null,
        status: this.formStatus(),
        notes: this.formNotes().trim() || null,
      };

      this.adminService
        .updateLogEntry(editing.id, dto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeModal();
            this.toastMessage.set('Hito de itinerario actualizado.');
            this.showToast.set(true);
            this.fetchEntries();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toastMessage.set('Error al actualizar el hito.');
            this.showToast.set(true);
          },
        });
    } else {
      const dto: CreateRouteLogEntryDto = {
        routeId: this.selectedRouteId() || null,
        title: this.formTitle().trim(),
        orderIndex: Number(this.formOrderIndex()),
        plannedTime: this.formPlannedTime().trim(),
        notes: this.formNotes().trim() || null,
      };

      this.adminService
        .createLogEntry(dto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeModal();
            this.toastMessage.set('Hito añadido exitosamente.');
            this.showToast.set(true);
            this.fetchEntries();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toastMessage.set('Error al añadir el hito.');
            this.showToast.set(true);
          },
        });
    }
  }

  /**
   * Actualiza rápidamente el estado de un hito a COMPLETED o IN_PROGRESS.
   * @param entry Hito a actualizar.
   * @param status Nuevo estado.
   */
  public onQuickStatusUpdate(entry: IRouteLogEntry, status: ItineraryStatus): void {
    const now = new Date();
    const actualTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.adminService
      .updateLogEntry(entry.id, {
        status,
        actualTime: status === ItineraryStatus.COMPLETED || status === ItineraryStatus.IN_PROGRESS ? actualTime : entry.actualTime,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.entries.update((list) =>
            list.map((e) => (e.id === updated.id ? { ...e, status: updated.status, actualTime: updated.actualTime } : e)),
          );
          this.toastMessage.set(`Hito actualizado a ${status}`);
          this.showToast.set(true);
        },
      });
  }

  /**
   * Elimina un hito del itinerario.
   * @param entry Hito a eliminar.
   */
  public onDelete(entry: IRouteLogEntry): void {
    if (confirm(`¿Eliminar el hito "${entry.title}"?`)) {
      this.adminService
        .deleteLogEntry(entry.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.entries.update((list) => list.filter((e) => e.id !== entry.id));
            this.toastMessage.set('Hito eliminado.');
            this.showToast.set(true);
          },
        });
    }
  }

  /**
   * Retorna la clase CSS para el badge de estado de itinerario.
   * @param status Estado de itinerario.
   * @returns Nombre de clase CSS BEM.
   */
  public getStatusClass(status: ItineraryStatus): string {
    switch (status) {
      case ItineraryStatus.COMPLETED:
        return 'status-badge--completed';
      case ItineraryStatus.IN_PROGRESS:
        return 'status-badge--progress';
      case ItineraryStatus.DELAYED:
        return 'status-badge--delayed';
      default:
        return 'status-badge--pending';
    }
  }

  /**
   * Retorna la etiqueta legible en español del estado.
   * @param status Estado de itinerario.
   * @returns Texto descriptivo.
   */
  public getStatusLabel(status: ItineraryStatus): string {
    switch (status) {
      case ItineraryStatus.COMPLETED:
        return 'Finalizado';
      case ItineraryStatus.IN_PROGRESS:
        return 'En progreso';
      case ItineraryStatus.DELAYED:
        return 'Retrasado';
      default:
        return 'Pendiente';
    }
  }
}
