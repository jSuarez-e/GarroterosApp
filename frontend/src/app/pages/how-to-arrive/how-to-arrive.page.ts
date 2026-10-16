/**
 * @sdd
 * [Objetivo]: Vista de navegacion y calculo geoespacial hacia el punto de encuentro oficial (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Consume TelemetryService.getHowToArrive con coordenadas en tiempo real; expone intents a Google Maps y Waze.
 * [Edge Cases]: Fallback a coordenadas por defecto de Piedecuesta si el usuario no tiene GPS activo, suscripcion segura.
 */

import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  navigateOutline,
  mapOutline,
  locationOutline,
  walkOutline,
  carOutline,
  openOutline,
  informationCircleOutline,
  shieldCheckmarkOutline,
  compassOutline,
  refreshOutline,
} from 'ionicons/icons';
import { TelemetryService, HowToArriveData } from '../../core/services/telemetry.service';
import {
  HeroBannerComponent,
  InfoCardComponent,
  StatBadgeComponent,
} from '../../shared/components';

@Component({
  selector: 'app-how-to-arrive',
  templateUrl: './how-to-arrive.page.html',
  styleUrls: ['./how-to-arrive.page.scss'],
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
    StatBadgeComponent,
  ],
})
export class HowToArrivePage implements OnInit, ViewWillEnter {
  private readonly telemetryService = inject(TelemetryService);
  private readonly destroyRef = inject(DestroyRef);

  public routeData = signal<HowToArriveData | null>(null);
  public isLoading = signal<boolean>(true);

  constructor() {
    addIcons({
      navigateOutline,
      mapOutline,
      locationOutline,
      walkOutline,
      carOutline,
      openOutline,
      informationCircleOutline,
      shieldCheckmarkOutline,
      compassOutline,
      refreshOutline,
    });
  }

  ngOnInit(): void {
    void this.loadNavigationData();
  }

  ionViewWillEnter(): void {
    void this.loadNavigationData();
  }

  /**
   * Obtiene la ruta al punto de encuentro usando las coordenadas del GPS actual o el centro de Piedecuesta.
   */
  public async loadNavigationData(): Promise<void> {
    this.isLoading.set(true);

    const position = await this.telemetryService.getCurrentPosition();
    const lat = position?.latitude ?? 6.995;
    const lng = position?.longitude ?? -73.055;

    this.telemetryService
      .getHowToArrive(lat, lng)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: HowToArriveData) => {
          this.routeData.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Abre la navegacion en Google Maps.
   */
  public openGoogleMaps(): void {
    const url = this.routeData()?.googleMapsUrl;
    if (url) {
      window.open(url, '_blank');
    }
  }

  /**
   * Abre la navegacion en Waze.
   */
  public openWaze(): void {
    const url = this.routeData()?.wazeUrl;
    if (url) {
      window.open(url, '_blank');
    }
  }
}
