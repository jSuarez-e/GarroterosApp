/**
 * @sdd
 * [Objetivo]: Página de diagnóstico y configuración de permisos del dispositivo móvil (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta PermissionsService. Expone señales reactivas para GPS, Notificaciones y Conectividad con botones de activación.
 * [Edge Cases]: Feedback interactivo inmediato y explicaciones didácticas de por qué se requiere cada permiso.
 */

// frontend/src/app/pages/permissions/permissions.page.ts

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonToast,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  locationOutline,
  notificationsOutline,
  wifiOutline,
  checkmarkCircle,
  closeCircle,
  alertCircle,
  refreshOutline,
} from 'ionicons/icons';
import {
  PermissionsService,
  PermissionState,
} from '../../core/services/permissions.service';
import {
  HeroBannerComponent,
  InfoCardComponent,
} from '../../shared/components';

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.page.html',
  styleUrls: ['./permissions.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonToast,
    HeroBannerComponent,
    InfoCardComponent,
  ],
})
export class PermissionsPage implements OnInit {
  private readonly permissionsService = inject(PermissionsService);

  public readonly gpsStatus = this.permissionsService.gpsStatus;
  public readonly notificationStatus = this.permissionsService.notificationStatus;
  public readonly networkStatus = this.permissionsService.networkStatus;

  public readonly isDiagnosing = signal<boolean>(false);
  public readonly showToast = signal<boolean>(false);
  public readonly toastMessage = signal<string>('');

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      locationOutline,
      notificationsOutline,
      wifiOutline,
      checkmarkCircle,
      closeCircle,
      alertCircle,
      refreshOutline,
    });
  }

  ngOnInit(): void {
    this.refreshDiagnostics();
  }

  /**
   * Ejecuta el diagnóstico de permisos del dispositivo.
   */
  public async refreshDiagnostics(): Promise<void> {
    this.isDiagnosing.set(true);
    await this.permissionsService.checkInitialPermissions();
    this.isDiagnosing.set(false);
  }

  /**
   * Solicita al sistema el permiso de ubicación GPS de alta precisión.
   */
  public async onRequestGps(): Promise<void> {
    const res = await this.permissionsService.requestGpsPermission();
    if (res === 'granted') {
      this.toastMessage.set('Permiso de GPS concedido exitosamente.');
    } else {
      this.toastMessage.set('Permiso de GPS denegado. Habilítalo en la configuración de tu navegador.');
    }
    this.showToast.set(true);
  }

  /**
   * Solicita el permiso para notificaciones push de auxilio y recorrido.
   */
  public async onRequestNotifications(): Promise<void> {
    const res = await this.permissionsService.requestNotificationPermission();
    if (res === 'granted') {
      this.toastMessage.set('Permiso de notificaciones push concedido.');
    } else {
      this.toastMessage.set('Permiso de notificaciones denegado.');
    }
    this.showToast.set(true);
  }

  /**
   * Retorna la clase CSS para el badge según el estado del permiso.
   * @param status Estado del permiso.
   * @returns Nombre de clase modificadora BEM.
   */
  public getStatusClass(status: PermissionState | string): string {
    if (status === 'granted' || status === 'online') return 'permission-badge--granted';
    if (status === 'denied' || status === 'offline') return 'permission-badge--denied';
    return 'permission-badge--prompt';
  }

  /**
   * Retorna la etiqueta legible en español del estado.
   * @param status Estado.
   * @returns Texto descriptivo.
   */
  public getStatusLabel(status: PermissionState | string): string {
    if (status === 'granted') return 'Concedido';
    if (status === 'denied') return 'Denegado';
    if (status === 'online') return 'Conectado';
    if (status === 'offline') return 'Sin conexión';
    return 'Pendiente';
  }
}
