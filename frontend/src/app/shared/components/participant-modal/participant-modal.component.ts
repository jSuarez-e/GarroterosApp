/**
 * @sdd
 * [Objetivo]: Modal de informacion basica del participante en el mapa interactivo (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Recibe @Input participant (ParticipantProfileDto). Muestra nombre, rol (Guia/Turista), bateria y ubicacion.
 * [Edge Cases]: Distincion visual entre Guia (ADMIN) y Turista (USER), alerta visual inmediata si isSos es verdadero.
 */

import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonBadge,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  batteryChargingOutline,
  batteryFullOutline,
  locationOutline,
  timeOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import type { ParticipantProfileDto } from '../../../../../../shared/src/index';

@Component({
  selector: 'app-participant-modal',
  templateUrl: './participant-modal.component.html',
  styleUrls: ['./participant-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonBadge,
  ],
})
export class ParticipantModalComponent {
  private readonly modalCtrl = inject(ModalController);

  @Input({ required: true }) participant!: ParticipantProfileDto;

  constructor() {
    addIcons({
      closeOutline,
      personCircleOutline,
      shieldCheckmarkOutline,
      batteryChargingOutline,
      batteryFullOutline,
      locationOutline,
      timeOutline,
      alertCircleOutline,
    });
  }

  public dismiss(): void {
    this.modalCtrl.dismiss();
  }

  public formatTime(dateStr: string): string {
    if (!dateStr) return 'Reciente';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Reciente';
    }
  }
}
