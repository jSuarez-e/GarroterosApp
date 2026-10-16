/**
 * @sdd
 * [Objetivo]: Vista dedicada de meteorologia en vivo y pronostico por horas para la ruta (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Consume RoutesService.getWeather(). Muestra estado actual, tarjetas horarias y recomendaciones de senderismo.
 * [Edge Cases]: Fallback transparente ante caidas de red, suscripcion reactiva segura con takeUntilDestroyed.
 */

import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  sunnyOutline,
  partlySunnyOutline,
  cloudyOutline,
  rainyOutline,
  umbrellaOutline,
  waterOutline,
  speedometerOutline,
  shieldCheckmarkOutline,
  timeOutline,
  refreshOutline,
} from 'ionicons/icons';
import { RoutesService } from '../../core/services/routes.service';
import type { WeatherReportDto } from '../../../../../shared/src/index';

@Component({
  selector: 'app-weather',
  templateUrl: './weather.page.html',
  styleUrls: ['./weather.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class WeatherPage implements OnInit {
  private readonly routesService = inject(RoutesService);
  private readonly destroyRef = inject(DestroyRef);

  public weather = signal<WeatherReportDto | null>(null);
  public isLoading = signal<boolean>(true);

  constructor() {
    addIcons({
      sunnyOutline,
      partlySunnyOutline,
      cloudyOutline,
      rainyOutline,
      umbrellaOutline,
      waterOutline,
      speedometerOutline,
      shieldCheckmarkOutline,
      timeOutline,
      refreshOutline,
    });
  }

  ngOnInit(): void {
    this.fetchWeather();
  }

  public fetchWeather(forceRefresh = false): void {
    this.isLoading.set(true);
    this.routesService
      .getWeather(forceRefresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.weather.set(data);
        this.isLoading.set(false);
      });
  }

  public handleRefresh(event: CustomEvent): void {
    this.routesService
      .getWeather(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.weather.set(data);
        (event.target as HTMLIonRefresherElement).complete();
      });
  }
}
