/**
 * @sdd
 * [Objetivo]: Panel administrativo para la bitácora colaborativa de notas de eventos e incidencias de guías (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta AdminService. Permite listar notas en tiempo real, filtrar por severidad, publicar nuevas notas y eliminar.
 * [Edge Cases]: Validación de campos obligatorios, ordenación cronológica descendente y feedback reactivo con Signals.
 */

// frontend/src/app/pages/admin/notes/admin-notes.page.ts

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
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  createOutline,
  trashOutline,
  informationCircleOutline,
  warningOutline,
  alertCircleOutline,
  sendOutline,
  personCircleOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  AdminService,
  IEventNote,
  EventNoteSeverity,
  CreateEventNoteDto,
} from '../../../core/services/admin.service';
import {
  HeroBannerComponent,
  InfoCardComponent,
  RouteSelectorComponent,
} from '../../../shared/components';
import type { RouteEntityDto } from '../../../../../../shared/src/index';

@Component({
  selector: 'app-admin-notes',
  templateUrl: './admin-notes.page.html',
  styleUrls: ['./admin-notes.page.scss'],
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
    HeroBannerComponent,
    InfoCardComponent,
    RouteSelectorComponent,
  ],
})
export class AdminNotesPage implements OnInit, ViewWillEnter {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly notes = signal<IEventNote[]>([]);
  public readonly selectedRouteId = signal<string | null>(null);
  public readonly selectedRouteName = signal<string>('');
  public readonly isLoading = signal<boolean>(true);
  public readonly isSubmitting = signal<boolean>(false);

  // Form Fields
  public readonly formTitle = signal<string>('');
  public readonly formContent = signal<string>('');
  public readonly formSeverity = signal<EventNoteSeverity>(EventNoteSeverity.INFO);

  public readonly showToast = signal<boolean>(false);
  public readonly toastMessage = signal<string>('');

  constructor() {
    addIcons({
      documentTextOutline,
      createOutline,
      trashOutline,
      informationCircleOutline,
      warningOutline,
      alertCircleOutline,
      sendOutline,
      personCircleOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.fetchNotes();
  }

  /**
   * Refresca la lista de notas al ingresar a la vista.
   */
  ionViewWillEnter(): void {
    this.fetchNotes();
  }

  /**
   * Reacciona al cambio de ruta seleccionada en el selector universal.
   * @param route Ruta seleccionada.
   */
  public onRouteChanged(route: RouteEntityDto): void {
    this.selectedRouteId.set(route.id);
    this.selectedRouteName.set(route.name);
    this.fetchNotes(route.id);
  }

  /**
   * Obtiene la lista completa de notas colaborativas desde el backend, opcionalmente filtrada por ruta.
   * @param routeId Identificador opcional de la ruta.
   */
  public fetchNotes(routeId?: string | null): void {
    const targetRouteId = routeId !== undefined ? (routeId || undefined) : (this.selectedRouteId() || undefined);
    this.isLoading.set(true);
    this.adminService
      .getNotes(targetRouteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.notes.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Actualiza el valor de un campo de texto de forma tipada.
   * @param targetSignal Señal a modificar.
   * @param event Evento del input.
   */
  public onInputChange(targetSignal: { set: (val: string) => void }, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) targetSignal.set(input.value);
  }

  /**
   * Actualiza el valor de un textarea de forma tipada.
   * @param targetSignal Señal a modificar.
   * @param event Evento del textarea.
   */
  public onTextAreaChange(targetSignal: { set: (val: string) => void }, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) targetSignal.set(textarea.value);
  }

  /**
   * Registra una nueva nota colaborativa de los guías.
   */
  public onSubmitNote(): void {
    if (!this.formTitle().trim() || !this.formContent().trim()) {
      this.toastMessage.set('Título y contenido de la nota son obligatorios.');
      this.showToast.set(true);
      return;
    }

    this.isSubmitting.set(true);
    const dto: CreateEventNoteDto = {
      routeId: this.selectedRouteId() || null,
      title: this.formTitle().trim(),
      content: this.formContent().trim(),
      severity: this.formSeverity(),
    };

    this.adminService
      .createNote(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newNote) => {
          this.isSubmitting.set(false);
          this.notes.update((list) => [newNote, ...list]);
          this.formTitle.set('');
          this.formContent.set('');
          this.formSeverity.set(EventNoteSeverity.INFO);
          this.toastMessage.set('Nota registrada en la bitácora.');
          this.showToast.set(true);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastMessage.set('Error al registrar la nota.');
          this.showToast.set(true);
        },
      });
  }

  /**
   * Elimina una nota de la bitácora tras confirmación.
   * @param note Nota a eliminar.
   */
  public onDeleteNote(note: IEventNote): void {
    if (confirm(`¿Eliminar la nota "${note.title}"?`)) {
      this.adminService
        .deleteNote(note.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notes.update((list) => list.filter((n) => n.id !== note.id));
            this.toastMessage.set('Nota eliminada.');
            this.showToast.set(true);
          },
        });
    }
  }

  /**
   * Retorna la clase CSS para el badge según la severidad.
   * @param severity Nivel de severidad.
   * @returns Nombre de clase BEM.
   */
  public getSeverityClass(severity: EventNoteSeverity): string {
    switch (severity) {
      case EventNoteSeverity.CRITICAL:
        return 'severity-badge--critical';
      case EventNoteSeverity.WARNING:
        return 'severity-badge--warning';
      default:
        return 'severity-badge--info';
    }
  }

  /**
   * Formatea la fecha ISO a texto legible corto.
   * @param dateStr Fecha o string ISO.
   * @returns Hora legible.
   */
  public formatTime(dateStr: string | Date): string {
    try {
      const d = new Date(dateStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} - ${d.toLocaleDateString()}`;
    } catch {
      return String(dateStr);
    }
  }
}
