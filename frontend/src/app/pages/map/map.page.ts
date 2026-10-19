/**
 * @sdd
 * [Objetivo]: Pagina principal del Mapa Interactivo con polilinea, POIs multimedia y telemetria en vivo (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Consume RoutesService y TelemetryService. Renderiza MapLibre GL JS con 3 capas reactivas y badge flotante de clima.
 * [Edge Cases]: Inicializacion en ionViewDidEnter() con map.resize() para evitar mapa gris en Ionic. Limpieza estricta de markers en destroy.
 */

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
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
  ModalController,
  ViewDidEnter,
  ViewDidLeave,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  navigateOutline,
  locateOutline,
  partlySunnyOutline,
  rainyOutline,
  sunnyOutline,
  cloudyOutline,
  umbrellaOutline,
  personCircleOutline,
  layersOutline,
  informationCircleOutline,
  alertCircleOutline,
  trailSignOutline,
} from 'ionicons/icons';
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import { AuthService } from '../../core/services/auth.service';
import { RoutesService } from '../../core/services/routes.service';
import { TelemetryService, type GpsLocation } from '../../core/services/telemetry.service';
import { PoiDetailModalComponent } from '../../shared/components/poi-detail-modal/poi-detail-modal.component';
import { ParticipantModalComponent } from '../../shared/components/participant-modal/participant-modal.component';
import type {
  PoiDto,
  RoutePathDto,
  WeatherReportDto,
  ParticipantProfileDto,
} from '../../../../../shared/src/index';

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
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
  ],
})
export class MapPage implements OnInit, OnDestroy, ViewDidEnter, ViewDidLeave {
  private readonly router = inject(Router);
  private readonly routesService = inject(RoutesService);
  private readonly telemetryService = inject(TelemetryService);
  private readonly authService = inject(AuthService);
  private readonly modalCtrl = inject(ModalController);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  private map: MapLibreMap | null = null;
  private poiMarkers: Marker[] = [];
  private participantMarkers = new Map<string, Marker>();
  private userLocationMarker: Marker | null = null;

  public isMapLoaded = signal<boolean>(false);
  public weatherData = signal<WeatherReportDto | null>(null);
  public activeRouteName = signal<string>('');
  public poiCount = signal<number>(-1);
  public readonly activeSosAlert = this.telemetryService.activeSosAlert;

  public readonly hasActiveRoute = computed(() => {
    return this.authService.isAdmin() || Boolean(this.authService.currentUser()?.routeId || this.authService.currentUser()?.route?.id);
  });

  // Coordenadas oficiales de Piedecuesta, Santander
  private readonly DEFAULT_CENTER: [number, number] = [-73.0501, 6.9877];
  private readonly DEFAULT_ZOOM = 15;

  constructor() {
    addIcons({
      navigateOutline,
      locateOutline,
      partlySunnyOutline,
      rainyOutline,
      sunnyOutline,
      cloudyOutline,
      umbrellaOutline,
      personCircleOutline,
      layersOutline,
      informationCircleOutline,
      alertCircleOutline,
      trailSignOutline,
    });

    // Escucha reactiva a cambios de coordenadas del GPS propio y estado SOS
    effect(() => {
      const loc = this.telemetryService.currentLocation();
      const activeSos = this.telemetryService.activeSosAlert();
      const currentUserId = this.authService.currentUser()?.id;
      const isSos = !!activeSos && (!activeSos.userId || activeSos.userId === currentUserId);
      if (loc && this.map && this.isMapLoaded()) {
        this.updateUserLocationMarker(loc, isSos);
      }
    });
  }

  ngOnInit(): void {
    // Escucha el clima y sincroniza el badge flotante
    this.routesService
      .getWeather()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((w) => {
        if (w) this.weatherData.set(w);
      });
  }

  ionViewDidEnter(): void {
    // Regla de Ciclo de Vida Ionic: Inicializar cuando el DOM este listo y dimensionado
    if (!this.map) {
      this.initMap();
    } else {
      setTimeout(() => this.map?.resize(), 100);
      this.loadRouteLine(true);
      this.loadPoiMarkers(true);
    }

    // Iniciar rastreo de telemetria GPS local y obtener posicion inmediata
    void this.telemetryService.startTracking();
    void this.telemetryService.getCurrentPosition().then((loc) => {
      if (loc && this.map && this.isMapLoaded()) {
        const activeSos = this.telemetryService.activeSosAlert();
        const currentUserId = this.authService.currentUser()?.id;
        const isSos = !!activeSos && (!activeSos.userId || activeSos.userId === currentUserId);
        this.updateUserLocationMarker(loc, isSos);
      }
    });
  }

  ionViewDidLeave(): void {
    // Vista en segundo plano
  }

  ngOnDestroy(): void {
    this.clearAllMarkers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Inicializa la instancia WebGL de MapLibre GL JS y sus capas superpuestas.
   */
  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    try {
      setWorkerUrl('assets/maplibre/maplibre-gl-worker.mjs');
    } catch {
      // Ignorar si el worker ya fue inicializado previamente
    }

    const mapInstance = new MapLibreMap({
      container: this.mapContainer.nativeElement,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: this.DEFAULT_CENTER,
      zoom: this.DEFAULT_ZOOM,
      pitch: 35,
      bearing: 10,
    });

    this.map = mapInstance;

    mapInstance.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');

    mapInstance.on('load', () => {
      this.isMapLoaded.set(true);
      this.loadRouteLine(true);
      this.loadPoiMarkers(true);
      this.setupParticipantsTracking();
      const currentLoc = this.telemetryService.currentLocation();
      if (currentLoc) {
        this.updateUserLocationMarker(currentLoc);
      }
      setTimeout(() => this.map?.resize(), 200);
    });
  }

  /**
   * Capa 1 — Polilinea del Recorrido (LineString) en azul contrastante (#2563EB).
   */
  private loadRouteLine(forceRefresh = false): void {
    if (!this.map) return;

    if (!this.hasActiveRoute()) {
      this.activeRouteName.set('Sin ruta activa');
      const existingSource = this.map.getSource('route-path') as GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
        });
      }
      return;
    }

    const targetRouteId = this.authService.currentUser()?.routeId || this.authService.currentUser()?.route?.id || undefined;

    this.routesService
      .getRoutePath(targetRouteId, forceRefresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((path: RoutePathDto | null) => {
        if (!this.map) return;
        if (path?.name) {
          this.activeRouteName.set(path.name);
        }

        const coordinates = (path && path.coordinates && path.coordinates.length > 0)
          ? path.coordinates
          : [];

        const geojson = {
          type: 'Feature' as const,
          properties: { name: path?.name || '' },
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        };

        const existingSource = this.map.getSource('route-path') as GeoJSONSource | undefined;
        if (existingSource) {
          existingSource.setData(geojson);
          return;
        }

        if (coordinates.length === 0) {
          return;
        }

        this.map.addSource('route-path', {
          type: 'geojson',
          data: geojson,
        });

        // Capa de resplandor / contorno exterior
        this.map.addLayer({
          id: 'route-path-casing',
          type: 'line',
          source: 'route-path',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 8,
            'line-opacity': 0.5,
          },
        });

        // Capa principal de la ruta
        this.map.addLayer({
          id: 'route-path-line',
          type: 'line',
          source: 'route-path',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#2563eb',
            'line-width': 5,
            'line-opacity': 0.95,
          },
        });
      });
  }

  /**
   * Capa 2 — Puntos de Interes / Waypoints (POIs) numerados con modal multimedia al click.
   */
  private loadPoiMarkers(forceRefresh = false): void {
    if (!this.map) return;

    if (!this.hasActiveRoute()) {
      this.poiCount.set(0);
      this.poiMarkers.forEach((m) => m.remove());
      this.poiMarkers = [];
      return;
    }

    const targetRouteId = this.authService.currentUser()?.routeId || this.authService.currentUser()?.route?.id || undefined;

    this.routesService
      .getWaypoints(targetRouteId, forceRefresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pois: PoiDto[]) => {
        if (!this.map) return;

        this.poiCount.set(pois.length);
        if (pois.length > 0 && pois[0]?.routeName) {
          this.activeRouteName.set(pois[0].routeName);
        }

        // Limpiar markers antiguos de POI
        this.poiMarkers.forEach((m) => m.remove());
        this.poiMarkers = [];

        for (const poi of pois) {
          const el = document.createElement('div');
          el.className = 'poi-marker-badge';
          el.innerHTML = `
            <div class="poi-marker-badge__pin">
              <span class="poi-marker-badge__number">${poi.orderIndex}</span>
            </div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPoiModal(poi);
          });

          const marker = new Marker({ element: el, anchor: 'bottom' })
            .setLngLat([poi.location.longitude, poi.location.latitude])
            .addTo(this.map);

          this.poiMarkers.push(marker);
        }
      });
  }

  /**
   * Capa 3 — Participantes en Tiempo Real sincronizados con TelemetryService.
   */
  private setupParticipantsTracking(): void {
    interval(2000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateParticipantMarkers();
      });

    this.updateParticipantMarkers();
  }

  private updateParticipantMarkers(): void {
    if (!this.map) return;

    const participantsMap = this.telemetryService.liveLocations();
    const activeIds = new Set<string>();
    const currentUserId = this.authService.currentUser()?.id;

    for (const p of participantsMap.values()) {
      // Evitar duplicar el marcador si es el usuario activo (este usa userLocationMarker)
      if (currentUserId && p.userId === currentUserId) {
        continue;
      }

      activeIds.add(p.userId);

      const profile: ParticipantProfileDto = {
        userId: p.userId,
        fullName: p.fullName || 'Participante',
        role: p.role === 'ADMIN' ? 'ADMIN' : 'USER',
        batteryLevel: p.batteryLevel,
        latitude: p.latitude,
        longitude: p.longitude,
        updatedAt: p.timestamp ? new Date(p.timestamp).toISOString() : new Date().toISOString(),
        isSos: p.isSos,
      };

      if (this.participantMarkers.has(p.userId)) {
        const marker = this.participantMarkers.get(p.userId)!;
        marker.setLngLat([p.longitude, p.latitude]);
        const markerElement = marker.getElement();
        markerElement.classList.toggle('participant-marker--sos', !!p.isSos);
      } else {
        const el = document.createElement('div');
        const isGuide = p.role === 'ADMIN';
        el.className = isGuide
          ? 'participant-marker participant-marker--guide'
          : 'participant-marker participant-marker--tourist';

        if (p.isSos) {
          el.classList.add('participant-marker--sos');
        }

        el.innerHTML = `
          <div class="participant-marker__avatar">
            <span>${p.fullName ? p.fullName.charAt(0).toUpperCase() : 'U'}</span>
          </div>
          ${isGuide ? '<span class="participant-marker__badge">Guía</span>' : ''}
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openParticipantModal(profile);
        });

        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat([p.longitude, p.latitude])
          .addTo(this.map);

        this.participantMarkers.set(p.userId, marker);
      }
    }

    // Remover marcadores que ya no estan activos en Redis
    for (const [id, marker] of this.participantMarkers.entries()) {
      if (!activeIds.has(id)) {
        marker.remove();
        this.participantMarkers.delete(id);
      }
    }
  }

  /**
   * Renderiza y actualiza la posicion GPS del usuario activo con un marcador radar diferenciado de los guias.
   * Si el usuario activó la alerta SOS, el marcador cambia automáticamente a un rojo intenso y pulsante.
   * @param loc Coordenadas del sensor GPS del dispositivo.
   * @param isSos Indica si el usuario actual tiene una alerta de emergencia SOS activa.
   */
  private updateUserLocationMarker(loc: GpsLocation, isSos = false): void {
    if (!this.map) return;

    if (this.userLocationMarker) {
      this.userLocationMarker.setLngLat([loc.longitude, loc.latitude]);
      const markerElement = this.userLocationMarker.getElement();
      markerElement.classList.toggle('user-gps-marker--sos', isSos);
      const badge = markerElement.querySelector<HTMLSpanElement>('.user-gps-marker__badge');
      if (badge) {
        badge.textContent = isSos ? 'SOS ACTIVO' : 'Tú';
      }
      return;
    }

    const markerElement = document.createElement('div');
    markerElement.className = isSos ? 'user-gps-marker user-gps-marker--sos' : 'user-gps-marker';
    markerElement.innerHTML = `
      <div class="user-gps-marker__radar-ring" aria-hidden="true"></div>
      <div class="user-gps-marker__core-dot">
        <div class="user-gps-marker__inner-white"></div>
      </div>
      <span class="user-gps-marker__badge">${isSos ? 'SOS ACTIVO' : 'Tú'}</span>
    `;

    this.userLocationMarker = new Marker({ element: markerElement, anchor: 'center' })
      .setLngLat([loc.longitude, loc.latitude])
      .addTo(this.map);
  }

  private clearAllMarkers(): void {
    this.poiMarkers.forEach((m) => m.remove());
    this.poiMarkers = [];
    this.participantMarkers.forEach((m) => m.remove());
    this.participantMarkers.clear();
    if (this.userLocationMarker) {
      this.userLocationMarker.remove();
      this.userLocationMarker = null;
    }
  }

  public async openPoiModal(poi: PoiDto): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PoiDetailModalComponent,
      componentProps: { poi },
      breakpoints: [0, 0.6, 0.95],
      initialBreakpoint: 0.95,
    });
    await modal.present();
  }

  public async openParticipantModal(participant: ParticipantProfileDto): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ParticipantModalComponent,
      componentProps: { participant },
      breakpoints: [0, 0.45, 0.7],
      initialBreakpoint: 0.45,
    });
    await modal.present();
  }

  public recenterMap(): void {
    if (!this.map) return;

    const userLoc = this.telemetryService.currentLocation();
    if (userLoc) {
      this.map.flyTo({
        center: [userLoc.longitude, userLoc.latitude],
        zoom: 16,
        essential: true,
      });
    } else {
      this.map.flyTo({
        center: this.DEFAULT_CENTER,
        zoom: this.DEFAULT_ZOOM,
        essential: true,
      });
    }
  }

  public navigateToWeather(): void {
    this.router.navigate(['/weather']);
  }

  public navigateToRouteInfo(): void {
    void this.router.navigate(['/routes']);
  }

  public navigateToSos(): void {
    void this.router.navigate(['/sos']);
  }
}
