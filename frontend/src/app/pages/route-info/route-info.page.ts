/**
 * @sdd
 * [Objetivo]: Vista de catalogo secuencial de puntos de interes de la ruta (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Consume RoutesService y AudioPlayerService. Muestra fichas de POIs en orden secuencial con reproduccion de audio.
 * [Edge Cases]: Detiene y libera automaticamente el audio al abandonar la pagina (ViewDidLeave/ngOnDestroy).
 */

import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
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
  trailSignOutline,
} from 'ionicons/icons';
import { RoutesService } from '../../core/services/routes.service';
import { AuthService } from '../../core/services/auth.service';
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
  private readonly authService = inject(AuthService);
  public readonly audioPlayer = inject(AudioPlayerService);
  private readonly destroyRef = inject(DestroyRef);

  public waypoints = signal<PoiDto[]>([]);
  public activeRoute = signal<RoutePathDto | null>(null);
  public isLoading = signal<boolean>(true);

  public readonly hasActiveRoute = computed(() => {
    return this.authService.isAdmin() || Boolean(this.authService.currentUser()?.routeId);
  });

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
      trailSignOutline,
    });
  }

  ngOnInit(): void {
    this.fetchWaypoints();
  }

  ionViewWillEnter(): void {
    this.fetchWaypoints(true);
  }

  /**
   * Carga los puntos de interés de la ruta asignada al usuario desde el servicio.
   * @param forceRefresh Indica si se debe forzar la recarga ignorando la caché.
   */
  public fetchWaypoints(forceRefresh = false): void {
    const user = this.authService.currentUser();
    const userRouteId = user?.routeId;

    if (!this.authService.isAdmin() && !userRouteId) {
      this.isLoading.set(true);
      this.authService
        .refreshProfile()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedUser) => {
            if (updatedUser?.routeId) {
              this.loadRouteData(updatedUser.routeId, forceRefresh);
            } else {
              this.activeRoute.set(null);
              this.waypoints.set([]);
              this.isLoading.set(false);
            }
          },
          error: () => {
            this.activeRoute.set(null);
            this.waypoints.set([]);
            this.isLoading.set(false);
          },
        });
      return;
    }

    this.loadRouteData(userRouteId || undefined, forceRefresh);
  }

  /**
   * Carga trazado y waypoints de la ruta especificada.
   * @param routeId Identificador UUID opcional de la ruta.
   * @param forceRefresh Forzar recarga desde el backend.
   */
  private loadRouteData(routeId?: string, forceRefresh = false): void {
    this.isLoading.set(true);

    this.routesService
      .getRoutePath(routeId, forceRefresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((path) => {
        if (path) {
          this.activeRoute.set(path);
        }
      });

    this.routesService
      .getWaypoints(routeId, forceRefresh)
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
