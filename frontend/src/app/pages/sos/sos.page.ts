/**
 * @sdd
 * [Objetivo]: Pagina de emergencia SOS para emision de alertas prioritarias en ruta y asistencia inmediata (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Envia alerta mediante TelemetryService.triggerSos(); consume senales de alerta activa y coordenadas.
 * [Edge Cases]: Confirmacion de disparo para evitar falsos positivos, vibracion haptica continua y enlaces tel: directos.
 */

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  warningOutline,
  callOutline,
  shieldCheckmarkOutline,
  checkmarkCircleOutline,
  navigateOutline,
} from 'ionicons/icons';
import { TelemetryService } from '../../core/services/telemetry.service';
import { HeroBannerComponent, InfoCardComponent } from '../../shared/components';

@Component({
  selector: 'app-sos',
  templateUrl: './sos.page.html',
  styleUrls: ['./sos.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonSpinner,
    HeroBannerComponent,
    InfoCardComponent,
  ],
})
export class SosPage implements OnInit {
  private readonly telemetryService = inject(TelemetryService);
  private readonly toastCtrl = inject(ToastController);

  public isSending = signal<boolean>(false);
  public sosSent = signal<boolean>(false);
  public activeAlert = this.telemetryService.activeSosAlert;
  public currentCoords = this.telemetryService.currentLocation;

  constructor() {
    addIcons({
      alertCircleOutline,
      warningOutline,
      callOutline,
      shieldCheckmarkOutline,
      checkmarkCircleOutline,
      navigateOutline,
    });
  }

  /**
   * Inicializa la lectura temprana de GPS para tener coordenadas listas.
   */
  public ngOnInit(): void {
    void this.telemetryService.getCurrentPosition();
  }

  /**
   * Dispara la alerta de emergencia SOS con coordenadas GPS y mensaje prioritario.
   */
  public async sendSosAlert(): Promise<void> {
    this.isSending.set(true);

    try {
      await this.telemetryService.triggerSos('¡EMERGENCIA EN RUTA! Usuario solicita asistencia inmediata.');
      this.isSending.set(false);
      this.sosSent.set(true);

      const toast = await this.toastCtrl.create({
        message: '¡Alerta SOS emitida y registrada con éxito para todos los guías y administradores!',
        duration: 4000,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    } catch {
      this.isSending.set(false);
      const toast = await this.toastCtrl.create({
        message: 'No fue posible registrar la alerta SOS en el servidor. Verifique su conexión y reintente.',
        duration: 5000,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    }
  }

  /**
   * Descarta el estado visual de alerta activa.
   */
  public dismissAlert(): void {
    this.telemetryService.dismissSosAlert();
    this.sosSent.set(false);
  }
}
