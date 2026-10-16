/**
 * @sdd
 * [Objetivo]: Modal multimedia para visualizacion detallada de un Punto de Interes / POI (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Recibe @Input poi (PoiDto). Controla reproductor de audio con AudioPlayerService y galeria de fotos.
 * [Edge Cases]: Detiene y libera automaticamente el audio al cerrar el modal (ngOnDestroy/dismiss) para evitar solapamientos.
 */

import { Component, Input, inject, OnDestroy, signal } from '@angular/core';
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
  IonProgressBar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  playOutline,
  pauseOutline,
  volumeHighOutline,
  imagesOutline,
  locationOutline,
  timeOutline,
} from 'ionicons/icons';
import { AudioPlayerService } from '../../../core/services/audio-player.service';
import type { PoiDto } from '../../../../../../shared/src/index';

@Component({
  selector: 'app-poi-detail-modal',
  templateUrl: './poi-detail-modal.component.html',
  styleUrls: ['./poi-detail-modal.component.scss'],
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
    IonProgressBar,
  ],
})
export class PoiDetailModalComponent implements OnDestroy {
  private readonly modalCtrl = inject(ModalController);
  public readonly audioPlayer = inject(AudioPlayerService);

  @Input({ required: true }) poi!: PoiDto;

  public activeImageIndex = signal<number>(0);

  constructor() {
    addIcons({
      closeOutline,
      playOutline,
      pauseOutline,
      volumeHighOutline,
      imagesOutline,
      locationOutline,
      timeOutline,
    });
  }

  ngOnDestroy(): void {
    // Regla estricta: Liberar y detener audio al destruir o cerrar la modal
    this.audioPlayer.stop();
  }

  public dismiss(): void {
    this.audioPlayer.stop();
    this.modalCtrl.dismiss();
  }

  public selectImage(index: number): void {
    this.activeImageIndex.set(index);
  }

  public toggleAudio(): void {
    if (this.poi.audioUrl) {
      this.audioPlayer.toggle(this.poi.audioUrl);
    }
  }

  public formatSeconds(sec: number): string {
    if (!sec || isNaN(sec)) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const mStr = mins < 10 ? `0${mins}` : `${mins}`;
    const sStr = secs < 10 ? `0${secs}` : `${secs}`;
    return `${mStr}:${sStr}`;
  }
}
