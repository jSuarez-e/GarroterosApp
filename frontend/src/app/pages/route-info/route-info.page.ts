/**
 * @sdd
 * [Objetivo]: Vista de catalogo secuencial de puntos de interes de la ruta (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Consume RoutesService y AudioPlayerService. Muestra fichas de POIs en orden secuencial con reproduccion de audio.
 * [Edge Cases]: Detiene y libera automaticamente el audio al abandonar la pagina (ViewDidLeave/ngOnDestroy).
 */

import { Component, OnInit, OnDestroy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonProgressBar,
  ViewDidLeave,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  playOutline,
  pauseOutline,
  volumeHighOutline,
  locationOutline,
  timeOutline,
  imagesOutline,
  mapOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { RoutesService } from '../../core/services/routes.service';
import { AudioPlayerService } from '../../core/services/audio-player.service';
import { HeroBannerComponent } from '../../shared/components';
import type { PoiDto, RoutePathDto } from '../../../../../shared/src/index';

@Component({
  selector: 'app-route-info',
  templateUrl: './route-info.page.html',
  styleUrls: ['./route-info.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
    IonProgressBar,
    HeroBannerComponent,
  ],
})
export class RouteInfoPage implements OnInit, OnDestroy, ViewDidLeave, ViewWillEnter {
  private readonly routesService = inject(RoutesService);
  public readonly audioPlayer = inject(AudioPlayerService);
  private readonly destroyRef = inject(DestroyRef);

  public waypoints = signal<PoiDto[]>([]);
  public activeRoute = signal<RoutePathDto | null>(null);
  public isLoading = signal<boolean>(true);

  constructor() {
    addIcons({
      playOutline,
      pauseOutline,
      volumeHighOutline,
      locationOutline,
      timeOutline,
      imagesOutline,
      mapOutline,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    this.fetchWaypoints();
  }

  ionViewWillEnter(): void {
    this.fetchWaypoints(true);
  }

  /**
   * Carga los puntos de interés de la ruta activa desde el servicio.
   * @param forceRefresh Indica si se debe forzar la recarga ignorando la caché.
   */
  public fetchWaypoints(forceRefresh = false): void {
    this.isLoading.set(true);

    this.routesService
      .getRoutePath(forceRefresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((path) => {
        if (path) {
          this.activeRoute.set(path);
        }
      });

    this.routesService
      .getWaypoints(undefined, forceRefresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.waypoints.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  ionViewDidLeave(): void {
    // Detiene el audio al salir de la pantalla para evitar solapamientos
    this.audioPlayer.stop();
  }

  ngOnDestroy(): void {
    this.audioPlayer.stop();
  }

  public toggleAudio(url?: string | null): void {
    if (url) {
      this.audioPlayer.toggle(url);
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
