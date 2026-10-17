/**
 * @sdd
 * [Objetivo]: Pagina principal del recorrido turistico con diseno inspirado en travel/mobility UI (SDD-005-UI-REDESIGN).
 * [I/O]: Consume AuthService para datos de usuario; integra HeroBanner, SegmentedPill, InfoCard y StatBadge.
 * [Edge Cases]: Enlace reactivo mediante Signals (filterMode), control de acceso administrativo (isAdmin).
 */

// frontend/src/app/home/home.page.ts
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  trailSignOutline,
  personOutline,
  shieldCheckmarkOutline,
  mapOutline,
  informationCircleOutline,
  navigateOutline,
  footstepsOutline,
  timeOutline,
  sunnyOutline,
  partlySunnyOutline,
  alertCircleOutline,
  compassOutline,
  pinOutline,
  notificationsOutline,
  searchOutline,
  radioOutline,
  walkOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';
import { RoutesService } from '../core/services/routes.service';
import {
  HeroBannerComponent,
  InfoCardComponent,
  SegmentedPillComponent,
  StatBadgeComponent,
  type SegmentedPillOption,
} from '../shared/components';

/**
 * Vista de inicio redisenada con estetica moderna, hero banner curvo y tarjetas informativas.
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    HeroBannerComponent,
    InfoCardComponent,
    SegmentedPillComponent,
    StatBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit, ViewWillEnter {
  private readonly authService = inject(AuthService);
  private readonly routesService = inject(RoutesService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly currentUser = this.authService.currentUser;
  public readonly isAdmin = this.authService.isAdmin;

  public readonly routePath = this.routesService.routePath;
  public readonly waypoints = this.routesService.waypoints;
  public readonly weather = this.routesService.weather;
  public readonly itinerary = this.routesService.itinerary;
  public readonly isLoading = this.routesService.isLoading;

  /**
   * Pestaña o seccion activa en el selector de píldoras.
   */
  public readonly activeTab = signal<string>('recorrido');

  /**
   * Opciones del selector segmentado estilo mockup.
   */
  public readonly tabOptions: SegmentedPillOption[] = [
    { id: 'recorrido', label: 'Recorrido', icon: 'map-outline' },
    { id: 'itinerario', label: 'Itinerario', icon: 'time-outline' },
    { id: 'alertas', label: 'Asistencia', icon: 'alert-circle-outline' },
  ];

  public readonly startPoint = computed(() => {
    const list = this.waypoints();
    return list.length > 0 ? list[0] : null;
  });

  public readonly endPoint = computed(() => {
    const list = this.waypoints();
    return list.length > 1 ? list[list.length - 1] : null;
  });

  public readonly formattedDistance = computed(() => {
    const dist = this.routePath()?.totalDistanceKm;
    return dist !== undefined && dist !== null ? `${dist} km` : '0 km';
  });

  public readonly formattedDuration = computed(() => {
    const dur = this.routePath()?.estimatedDurationMinutes;
    return dur !== undefined && dur !== null ? `~${dur} min` : '~0 min';
  });

  public readonly poiCount = computed(() => {
    return `${this.waypoints().length} Puntos`;
  });

  public readonly currentTemp = computed(() => {
    const temp = this.weather()?.current?.temperature;
    return temp !== undefined && temp !== null ? `${temp}°C` : '22°C';
  });

  public readonly weatherDescription = computed(() => {
    return this.weather()?.current?.weatherDescription || 'Condiciones favorables para senderismo';
  });

  public readonly firstDepartureTime = computed(() => {
    const it = this.itinerary();
    return it.length > 0 ? it[0].plannedTime : '08:30 AM';
  });

  public readonly hasActiveRoute = computed(() => {
    return this.isAdmin() || Boolean(this.currentUser()?.routeId);
  });

  public readonly routeTitle = computed(() => {
    if (!this.hasActiveRoute()) {
      return 'Sin ruta activa';
    }
    return this.routePath()?.name || 'Ruta Garroteros';
  });

  public readonly routeSubtitle = computed(() => {
    if (!this.hasActiveRoute()) {
      return 'No tienes una ruta asignada en el momento';
    }
    const muni = this.routePath()?.municipality;
    return muni ? `Recorrido Oficial ${muni}` : 'Itinerario Guiado Centro Histórico';
  });

  constructor() {
    addIcons({
      trailSignOutline,
      personOutline,
      shieldCheckmarkOutline,
      mapOutline,
      informationCircleOutline,
      navigateOutline,
      footstepsOutline,
      timeOutline,
      sunnyOutline,
      partlySunnyOutline,
      alertCircleOutline,
      compassOutline,
      pinOutline,
      notificationsOutline,
      searchOutline,
      radioOutline,
      walkOutline,
    });
  }

  public ngOnInit(): void {
    this.fetchHomeData();
  }

  public ionViewWillEnter(): void {
    this.fetchHomeData(true);
  }

  /**
   * Carga los datos reactivos del recorrido, waypoints, meteorología e itinerario desde RoutesService.
   * Si el usuario no es admin y no tiene ruta asignada, refresca el perfil y omite la carga de rutas globales.
   * @param forceRefresh Indica si se debe omitir la memoria caché.
   */
  public fetchHomeData(forceRefresh = false): void {
    const user = this.currentUser();
    const userRouteId = user?.routeId;

    if (!this.isAdmin() && !userRouteId) {
      this.authService
        .refreshProfile()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedUser) => {
            if (updatedUser?.routeId) {
              this.loadUserRouteData(updatedUser.routeId, forceRefresh);
            } else {
              this.routesService.routePath.set(null);
              this.routesService.waypoints.set([]);
              this.routesService.itinerary.set([]);
            }
          },
          error: () => {
            this.routesService.routePath.set(null);
            this.routesService.waypoints.set([]);
            this.routesService.itinerary.set([]);
          },
        });
      return;
    }

    this.loadUserRouteData(userRouteId || undefined, forceRefresh);
  }

  /**
   * Carga datos específicos de la ruta y meteorología.
   * @param routeId Identificador UUID opcional de la ruta.
   * @param forceRefresh Forzar consulta al backend.
   */
  private loadUserRouteData(routeId?: string, forceRefresh = false): void {
    this.routesService.getRoutePath(routeId, forceRefresh).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.routesService.getWaypoints(routeId, forceRefresh).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.routesService.getWeather(forceRefresh).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.routesService.getItinerary(routeId, forceRefresh).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /**
   * Actualiza la pestaña seleccionada en el selector segmentado.
   * @param tabId Identificador de pestaña.
   */
  public onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }
}
