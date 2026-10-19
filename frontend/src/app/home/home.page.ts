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
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
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
  timerOutline,
  alarmOutline,
  calendarOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';
import { RoutesService } from '../core/services/routes.service';
import {
  HeroBannerComponent,
  InfoCardComponent,
  SegmentedPillComponent,
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit, ViewWillEnter, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly routesService = inject(RoutesService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly currentUser = this.authService.currentUser;
  public readonly isAdmin = this.authService.isAdmin;
  public readonly isGuide = this.authService.isGuide;
  public readonly isStaff = this.authService.isStaff;

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

  /**
   * Formatea una hora en formato de 12 horas con indicador AM/PM.
   * @param timeString Hora en formato HH:mm o HH:mm AM/PM.
   * @returns Cadena formateada amigable para la UI.
   */
  public formatTimeDisplay(timeString?: string | null): string {
    if (!timeString) {
      return '08:30 AM';
    }
    const cleaned = timeString.trim();
    if (/[APap][Mm]/.test(cleaned)) {
      return cleaned;
    }
    const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return cleaned;
    }
    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  public readonly firstDepartureTime = computed(() => {
    const routeStartTime = this.routePath()?.startTime;
    if (routeStartTime) {
      return this.formatTimeDisplay(routeStartTime);
    }
    const itineraryItems = this.itinerary();
    return itineraryItems.length > 0 ? this.formatTimeDisplay(itineraryItems[0].plannedTime) : '08:30 AM';
  });

  public readonly hasActiveRoute = computed(() => {
    return this.isAdmin() || Boolean(this.currentUser()?.routeId || this.currentUser()?.route?.id);
  });

  /**
   * Indica si la hora programada de encuentro ya transcurrió en el ciclo activo.
   */
  public readonly isMeetingTimePassed = signal<boolean>(false);

  /**
   * Texto formateado de la cuenta regresiva para iniciar la ruta (HHh MMm SSs).
   */
  public readonly countdownText = signal<string>('00h 00m 00s');

  /**
   * Fecha y hora objetivo de inicio calculada.
   */
  public readonly targetDepartureDate = signal<Date | null>(null);

  /**
   * Fecha formateada de la salida programada (ej. '18 Oct 2026').
   */
  /**
   * Formatea una cadena de fecha YYYY-MM-DD en formato amigable 'DD Mes YYYY'.
   * @param dateString Fecha en formato YYYY-MM-DD.
   * @returns Cadena formateada amigable o texto original.
   */
  public formatDateDisplay(dateString?: string | null): string {
    if (!dateString) {
      return '';
    }
    const parts = dateString.trim().split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const month = months[monthIndex] || '';
      return `${String(day).padStart(2, '0')} ${month} ${year}`;
    }
    return dateString;
  }

  /**
   * Fecha formateada de la salida programada (ej. '18 Oct 2026').
   */
  public readonly startDateFormatted = computed(() => {
    const routeStartDate = this.routePath()?.startDate;
    if (routeStartDate) {
      return this.formatDateDisplay(routeStartDate);
    }
    const targetDate = this.targetDepartureDate();
    const dateToFormat = targetDate || new Date();
    const day = String(dateToFormat.getDate()).padStart(2, '0');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[dateToFormat.getMonth()];
    const year = dateToFormat.getFullYear();
    return `${day} ${month} ${year}`;
  });

  /**
   * Rango de fechas para mostrar en la interfaz (ej. '19 Oct 2026' o '19 Oct - 20 Oct 2026').
   */
  public readonly dateDisplayRange = computed(() => {
    const routeStart = this.routePath()?.startDate;
    const routeEnd = this.routePath()?.endDate;
    if (!routeStart) {
      return this.startDateFormatted();
    }
    const formattedStart = this.formatDateDisplay(routeStart);
    if (routeEnd && routeEnd !== routeStart) {
      const formattedEnd = this.formatDateDisplay(routeEnd);
      return `${formattedStart} - ${formattedEnd}`;
    }
    return formattedStart;
  });

  /**
   * Etiqueta descriptiva según si el recorrido es de un único día o rango de fechas.
   */
  public readonly dateLabel = computed(() => {
    const routeStart = this.routePath()?.startDate;
    const routeEnd = this.routePath()?.endDate;
    return routeEnd && routeStart && routeEnd !== routeStart
      ? 'Fechas del Recorrido'
      : 'Fecha de Inicio';
  });

  /**
   * Visibilidad de la tarjeta de aviso de salida y tiempo de encuentro.
   * Se oculta automáticamente cuando la cuenta regresiva llega a 00:00:00.
   */
  public readonly isMeetingCardVisible = computed(() => {
    return !this.isMeetingTimePassed() && this.hasActiveRoute();
  });

  private countdownTimerId: ReturnType<typeof setInterval> | null = null;

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
      timerOutline,
      alarmOutline,
      calendarOutline,
    });

    effect(() => {
      const departureTime = this.firstDepartureTime();
      const scheduledStartDate = this.routePath()?.startDate;
      if (departureTime) {
        this.targetDepartureDate.set(this.calculateTargetMeetingDate(departureTime, scheduledStartDate));
        this.updateCountdown();
      }
    });
  }

  public ngOnInit(): void {
    this.fetchHomeData();
    this.startCountdownTimer();
  }

  public ionViewWillEnter(): void {
    this.fetchHomeData(true);
    this.startCountdownTimer();
  }

  public ngOnDestroy(): void {
    this.clearCountdownTimer();
  }

  /**
   * Inicia el temporizador de cuenta regresiva hacia la hora de inicio de la ruta.
   */
  public startCountdownTimer(): void {
    this.clearCountdownTimer();
    this.targetDepartureDate.set(
      this.calculateTargetMeetingDate(this.firstDepartureTime(), this.routePath()?.startDate),
    );
    this.updateCountdown();
    this.countdownTimerId = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  /**
   * Limpia el temporizador activo para prevenir fugas de memoria.
   */
  public clearCountdownTimer(): void {
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
  }

  /**
   * Actualiza el contador de tiempo restante hacia la salida.
   * Si el tiempo llega a cero, oculta la tarjeta reactivamente.
   */
  public updateCountdown(): void {
    if (!this.targetDepartureDate()) {
      this.targetDepartureDate.set(
        this.calculateTargetMeetingDate(this.firstDepartureTime(), this.routePath()?.startDate),
      );
    }

    const currentTarget = this.targetDepartureDate();

    if (!currentTarget) {
      this.isMeetingTimePassed.set(true);
      this.clearCountdownTimer();
      return;
    }

    const currentTime = new Date();
    const differenceMilliseconds = currentTarget.getTime() - currentTime.getTime();

    if (differenceMilliseconds <= 0) {
      this.countdownText.set('00h 00m 00s');
      this.isMeetingTimePassed.set(true);
      this.clearCountdownTimer();
      return;
    }

    const totalSeconds = Math.floor(differenceMilliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    this.countdownText.set(`${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`);
    this.isMeetingTimePassed.set(false);
  }

  /**
   * Resuelve la fecha y hora de la próxima salida a partir de una cadena horaria y fecha opcional.
   * Si se provee dateString (YYYY-MM-DD), targetea esa fecha exacta. De lo contrario, proyecta hoy o mañana.
   * @param timeString Hora en formato HH:mm o HH:mm AM/PM.
   * @param dateString Fecha en formato YYYY-MM-DD opcional.
   * @returns Instancia Date con la hora programada o null si no es válida.
   */
  public calculateTargetMeetingDate(timeString: string, dateString?: string | null): Date | null {
    if (!timeString) {
      return null;
    }

    const cleanedTimeString = timeString.trim();
    const timeRegexMatch = cleanedTimeString.match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?$/);
    if (!timeRegexMatch) {
      return null;
    }

    let parsedHours = parseInt(timeRegexMatch[1], 10);
    const parsedMinutes = parseInt(timeRegexMatch[2], 10);
    const amPmModifier = timeRegexMatch[3]?.toUpperCase();

    if (amPmModifier === 'PM' && parsedHours < 12) {
      parsedHours += 12;
    } else if (amPmModifier === 'AM' && parsedHours === 12) {
      parsedHours = 0;
    }

    if (dateString) {
      const dateParts = dateString.trim().split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const monthIndex = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        return new Date(year, monthIndex, day, parsedHours, parsedMinutes, 0, 0);
      }
    }

    const calculatedTarget = new Date();
    calculatedTarget.setHours(parsedHours, parsedMinutes, 0, 0);

    const currentTime = new Date();
    if (calculatedTarget.getTime() <= currentTime.getTime()) {
      calculatedTarget.setDate(calculatedTarget.getDate() + 1);
    }

    return calculatedTarget;
  }

  /**
   * Carga los datos reactivos del recorrido, waypoints, meteorología e itinerario desde RoutesService.
   * Si el usuario no es admin y no tiene ruta asignada, refresca el perfil y omite la carga de rutas globales.
   * @param forceRefresh Indica si se debe omitir la memoria caché.
   */
  public fetchHomeData(forceRefresh = false): void {
    const user = this.currentUser();
    const userRouteId = this.isAdmin() ? undefined : (user?.routeId || user?.route?.id);

    if (!this.isAdmin() && !userRouteId) {
      this.authService
        .refreshProfile()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedUser) => {
            const resolvedRouteId = updatedUser?.routeId || updatedUser?.route?.id;
            if (resolvedRouteId) {
              this.loadUserRouteData(resolvedRouteId, forceRefresh);
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

  /**
   * Retorna la etiqueta localizada en español para el estado del hito en el itinerario.
   * @param status Estado en formato enum del hito.
   * @returns Etiqueta amigable en español.
   */
  public getItineraryStatusLabel(status?: string | null): string {
    switch (status) {
      case 'COMPLETED':
      case 'FINISHED':
        return 'Finalizado';
      case 'IN_PROGRESS':
        return 'En progreso';
      case 'DELAYED':
        return 'Retrasado';
      case 'PENDING':
      default:
        return 'Pendiente';
    }
  }
}
