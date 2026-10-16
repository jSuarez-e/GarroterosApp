/**
 * @sdd
 * [Objetivo]: Panel administrativo para recepcion, geolocalizacion y bitacora de resolucion de alertas SOS de usuarios (SDD-003-TELEMETRY-REALTIME & SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta AdminService y SocketService. Expone lista reactiva de alertas, filtrado por estado, apertura de mapas y modal de gestion con nota del suceso.
 * [Edge Cases]: Actualizacion en tiempo real con WebSocket sos_broadcast, validacion de nota obligatoria al atender o cancelar, OnPush.
 */

// frontend/src/app/pages/admin/alerts/admin-alerts.page.ts

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
  IonModal,
  IonTextarea,
  IonRadioGroup,
  IonRadio,
  IonItem,
  IonLabel,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  warningOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  mapOutline,
  openOutline,
  navigateOutline,
  callOutline,
  mailOutline,
  batteryHalfOutline,
  timeOutline,
  documentTextOutline,
  personCircleOutline,
  refreshOutline,
  createOutline,
} from 'ionicons/icons';
import { AdminService } from '../../../core/services/admin.service';
import { SocketService } from '../../../core/services/socket.service';
import { HeroBannerComponent } from '../../../shared/components/hero-banner/hero-banner.component';
import {
  SosAlertStatus,
  type ISosAlertEntry,
  type UpdateSosAlertStatusDto,
} from '../../../../../../shared/src/index';

@Component({
  selector: 'app-admin-alerts',
  templateUrl: './admin-alerts.page.html',
  styleUrls: ['./admin-alerts.page.scss'],
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
    IonModal,
    IonTextarea,
    IonRadioGroup,
    IonRadio,
    IonItem,
    IonLabel,
    HeroBannerComponent,
  ],
})
export class AdminAlertsPage implements OnInit, ViewWillEnter {
  private readonly adminService = inject(AdminService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Senales de estado reactivo
  public readonly alerts = signal<ISosAlertEntry[]>([]);
  public readonly isLoading = signal<boolean>(true);
  public readonly selectedFilter = signal<string>('ALL');

  // Modal de gestion y bitacora del suceso
  public readonly isManageModalOpen = signal<boolean>(false);
  public readonly activeAlert = signal<ISosAlertEntry | null>(null);
  public readonly selectedNewStatus = signal<SosAlertStatus>(SosAlertStatus.ATTENDED);
  public readonly resolutionNote = signal<string>('');
  public readonly isSavingNote = signal<boolean>(false);

  // Toast feedback
  public readonly showToast = signal<boolean>(false);
  public readonly toastMessage = signal<string>('');
  public readonly toastColor = signal<string>('dark');

  public readonly SosAlertStatusEnum = SosAlertStatus;

  constructor() {
    addIcons({
      alertCircleOutline,
      warningOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      mapOutline,
      openOutline,
      navigateOutline,
      callOutline,
      mailOutline,
      batteryHalfOutline,
      timeOutline,
      documentTextOutline,
      personCircleOutline,
      refreshOutline,
      createOutline,
    });
  }

  ngOnInit(): void {
    this.fetchAlerts();
    this.setupRealtimeAlertListener();
  }

  ionViewWillEnter(): void {
    this.fetchAlerts();
  }

  /**
   * Escucha eventos de emergencia en vivo desde el WebSocket para agregarlos sin recarga.
   */
  private setupRealtimeAlertListener(): void {
    this.socketService.on<ISosAlertEntry>('sos_broadcast', (incomingAlert) => {
      this.alerts.update((current) => {
        const filtered = current.filter((a) => a.id !== incomingAlert.id);
        return [incomingAlert, ...filtered];
      });

      this.toastMessage.set(`¡Nueva Alerta SOS de ${incomingAlert.userName || 'Usuario'}!`);
      this.toastColor.set('danger');
      this.showToast.set(true);
    });
  }

  /**
   * Consulta las alertas desde el backend con filtro opcional.
   */
  public fetchAlerts(): void {
    this.isLoading.set(true);
    const filter = this.selectedFilter();
    const statusParam = filter === 'ALL' ? undefined : (filter as SosAlertStatus);

    this.adminService
      .getSosAlerts(statusParam)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.alerts.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toastMessage.set('Error al cargar la lista de alertas SOS.');
          this.toastColor.set('danger');
          this.showToast.set(true);
        },
      });
  }

  /**
   * Cambia el filtro de visualizacion.
   * @param filter Nuevo estado o ALL.
   */
  public setFilter(filter: string): void {
    this.selectedFilter.set(filter);
    this.fetchAlerts();
  }

  /**
   * Abre el modal para cambiar estado y colocar la nota del suceso.
   * @param alert Alerta seleccionada.
   */
  public openManageModal(alert: ISosAlertEntry): void {
    this.activeAlert.set(alert);
    this.selectedNewStatus.set(
      alert.status === SosAlertStatus.PENDING
        ? SosAlertStatus.ATTENDED
        : alert.status,
    );
    this.resolutionNote.set(alert.resolutionNote || '');
    this.isManageModalOpen.set(true);
  }

  /**
   * Cierra el modal de gestion.
   */
  public closeManageModal(): void {
    this.isManageModalOpen.set(false);
    this.activeAlert.set(null);
  }

  /**
   * Guarda el nuevo estado y la nota del suceso en el backend.
   */
  public submitStatusUpdate(): void {
    const alert = this.activeAlert();
    const note = this.resolutionNote().trim();

    if (!alert) return;

    if (!note || note.length < 3) {
      this.toastMessage.set('Debe ingresar una nota u observación del suceso (mínimo 3 caracteres).');
      this.toastColor.set('warning');
      this.showToast.set(true);
      return;
    }

    this.isSavingNote.set(true);
    const dto: UpdateSosAlertStatusDto = {
      status: this.selectedNewStatus(),
      resolutionNote: note,
    };

    this.adminService
      .updateSosAlertStatus(alert.id, dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.isSavingNote.set(false);
          this.alerts.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.closeManageModal();
          this.toastMessage.set('Registro de suceso y estado guardados con éxito.');
          this.toastColor.set('success');
          this.showToast.set(true);
        },
        error: () => {
          this.isSavingNote.set(false);
          this.toastMessage.set('Error al actualizar el estado de la alerta.');
          this.toastColor.set('danger');
          this.showToast.set(true);
        },
      });
  }

  /**
   * Abre la ubicacion en Google Maps para guiar al equipo de rescate en campo.
   * @param alert Alerta con coordenadas.
   */
  public openExternalMap(alert: ISosAlertEntry): void {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`;
    window.open(url, '_blank');
  }

  /**
   * Navega a la vista de mapa principal para inspeccion local.
   */
  public navigateToMainMap(): void {
    void this.router.navigate(['/map']);
  }

  /**
   * Retorna la clase CSS para el badge segun el estado de la alerta.
   * @param status Estado SosAlertStatus.
   * @returns Nombre de clase BEM.
   */
  public getStatusBadgeClass(status: SosAlertStatus): string {
    switch (status) {
      case SosAlertStatus.PENDING:
        return 'alert-badge--pending';
      case SosAlertStatus.ATTENDED:
        return 'alert-badge--attended';
      case SosAlertStatus.RESOLVED:
        return 'alert-badge--resolved';
      case SosAlertStatus.CANCELLED:
        return 'alert-badge--cancelled';
      default:
        return 'alert-badge--pending';
    }
  }

  /**
   * Etiqueta amigable para el estado.
   * @param status Estado de la alerta.
   * @returns Texto descriptivo en español.
   */
  public getStatusLabel(status: SosAlertStatus): string {
    switch (status) {
      case SosAlertStatus.PENDING:
        return 'Pendiente';
      case SosAlertStatus.ATTENDED:
        return 'En Atención';
      case SosAlertStatus.RESOLVED:
        return 'Resuelta';
      case SosAlertStatus.CANCELLED:
        return 'Cancelada / Falsa Alarma';
      default:
        return status;
    }
  }

  /**
   * Formatea la fecha y hora a formato extendido legible.
   * @param dateStr Fecha en ISO.
   * @returns Texto formateado en español.
   */
  public formatDateTime(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  }
}
