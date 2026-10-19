/**
 * @sdd
 * [Objetivo]: Panel administrativo para la gestión, georreferenciación y multimedia de Puntos de Interés (POIs) (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta AdminService. Permite consultar, crear, editar coordenadas GPS (latitud/longitud) y eliminar waypoints de la ruta.
 * [Edge Cases]: Validación numérica de coordenadas geográficas, separación de URLs fotográficas y sincronización con mapa.
 */

// frontend/src/app/pages/admin/pois/admin-pois.page.ts

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonToast,
  IonModal,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  addCircleOutline,
  createOutline,
  trashOutline,
  volumeHighOutline,
  imagesOutline,
  navigateOutline,
  closeOutline,
  locateOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { Map as MapLibreMap, Marker, NavigationControl, GeolocateControl, setWorkerUrl } from 'maplibre-gl';
import { Geolocation } from '@capacitor/geolocation';
import {
  AdminService,
  AdminPoi,
  AdminCreatePoiDto,
  AdminUpdatePoiDto,
} from '../../../core/services/admin.service';
import {
  HeroBannerComponent,
  RouteSelectorComponent,
} from '../../../shared/components';
import type { RouteEntityDto } from '../../../../../../shared/src/index';

@Component({
  selector: 'app-admin-pois',
  templateUrl: './admin-pois.page.html',
  styleUrls: ['./admin-pois.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonToast,
    IonModal,
    HeroBannerComponent,
    RouteSelectorComponent,
  ],
})
export class AdminPoisPage implements OnInit, ViewWillEnter, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('poiMapContainer', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;

  private pickerMap: MapLibreMap | null = null;
  private pickerMarker: Marker | null = null;
  private mapInitTimeout: ReturnType<typeof setTimeout> | null = null;

  public readonly pois = signal<AdminPoi[]>([]);
  public readonly selectedRouteId = signal<string | null>(null);
  public readonly selectedRouteName = signal<string>('');
  public readonly isLoading = signal<boolean>(true);
  public readonly isSubmitting = signal<boolean>(false);

  public readonly isModalOpen = signal<boolean>(false);
  public readonly editingPoi = signal<AdminPoi | null>(null);

  // Form Fields
  public readonly formTitle = signal<string>('');
  public readonly formDescription = signal<string>('');
  public readonly formOrderIndex = signal<number>(1);
  public readonly formLatitude = signal<number>(6.9877);
  public readonly formLongitude = signal<number>(-73.0501);
  public readonly formAudioUrl = signal<string>('');
  public readonly formPhotosRaw = signal<string>('');

  public readonly showToast = signal<boolean>(false);
  public readonly toastMessage = signal<string>('');
  public readonly isLocatingGps = signal<boolean>(false);

  constructor() {
    addIcons({
      locationOutline,
      addCircleOutline,
      createOutline,
      trashOutline,
      volumeHighOutline,
      imagesOutline,
      navigateOutline,
      closeOutline,
      locateOutline,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    this.fetchPois();
  }

  /**
   * Refresca la lista de POIs al ingresar a la vista.
   */
  ionViewWillEnter(): void {
    this.fetchPois();
  }

  ngOnDestroy(): void {
    this.destroyPickerMap();
  }

  /**
   * Reacciona al cambio de ruta seleccionada en el selector universal.
   * @param route Ruta seleccionada por el usuario.
   */
  public onRouteChanged(route: RouteEntityDto): void {
    this.selectedRouteId.set(route.id);
    this.selectedRouteName.set(route.name);
    this.fetchPois(route.id);
  }

  /**
   * Obtiene la lista de POIs del backend, opcionalmente filtrada por ruta.
   * @param routeId UUID opcional de la ruta para filtrar.
   */
  public fetchPois(routeId?: string | null): void {
    const targetRouteId = routeId !== undefined ? (routeId || undefined) : (this.selectedRouteId() || undefined);
    this.isLoading.set(true);
    this.adminService
      .getPois(targetRouteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pois.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Abre modal para crear un nuevo POI.
   */
  public openCreateModal(): void {
    this.editingPoi.set(null);
    this.formTitle.set('');
    this.formDescription.set('');
    this.formOrderIndex.set(this.pois().length + 1);
    this.formLatitude.set(6.9877);
    this.formLongitude.set(-73.0501);
    this.formAudioUrl.set('');
    this.formPhotosRaw.set('');
    this.isModalOpen.set(true);
    this.scheduleMapInit();
  }

  /**
   * Abre modal para editar un POI existente.
   * @param poi POI a modificar.
   */
  public openEditModal(poi: AdminPoi): void {
    this.editingPoi.set(poi);
    this.formTitle.set(poi.title);
    this.formDescription.set(poi.description);
    this.formOrderIndex.set(poi.orderIndex);
    this.formLatitude.set(poi.latitude);
    this.formLongitude.set(poi.longitude);
    this.formAudioUrl.set(poi.audioUrl || '');
    this.formPhotosRaw.set((poi.photoUrls || []).join('\n'));
    this.isModalOpen.set(true);
    this.scheduleMapInit();
  }

  /**
   * Inicializa el mapa MapLibre y el marcador interactivo una vez presentado el modal.
   */
  public onModalPresented(): void {
    this.scheduleMapInit();
  }

  /**
   * Obtiene la referencia al contenedor del mapa de forma resiliente tanto por ViewChild como por DOM selector.
   */
  private getMapContainerElement(): HTMLDivElement | null {
    if (this.mapContainer?.nativeElement) {
      return this.mapContainer.nativeElement;
    }
    const byId = document.getElementById('poiPickerMapContainer') as HTMLDivElement | null;
    if (byId) return byId;

    return document.querySelector('.poi-picker-map') as HTMLDivElement | null;
  }

  /**
   * Programa la inicialización del mapa con reintentos hasta que el DOM del modal esté completamente montado.
   * @param attempts Número de reintentos acumulados.
   */
  private scheduleMapInit(attempts = 0): void {
    if (this.mapInitTimeout) {
      clearTimeout(this.mapInitTimeout);
      this.mapInitTimeout = null;
    }
    if (!this.isModalOpen()) return;

    const container = this.getMapContainerElement();
    if (container) {
      this.initPickerMap(container);
    } else if (attempts < 15) {
      this.mapInitTimeout = setTimeout(() => this.scheduleMapInit(attempts + 1), 60);
    }
  }

  /**
   * Crea la instancia de MapLibre dentro del modal y vincula el puntero con las coordenadas del formulario.
   * @param resolvedContainer Contenedor HTML del mapa.
   */
  private initPickerMap(resolvedContainer?: HTMLDivElement): void {
    const container = resolvedContainer || this.getMapContainerElement();
    if (!container) return;

    this.destroyPickerMap();

    try {
      setWorkerUrl('assets/maplibre/maplibre-gl-worker.mjs');
    } catch {
      // Worker ya configurado
    }

    const lat = Number(this.formLatitude()) || 6.9877;
    const lng = Number(this.formLongitude()) || -73.0501;

    const map = new MapLibreMap({
      container,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [lng, lat],
      zoom: 16,
      pitch: 0,
    });

    this.pickerMap = map;

    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');

    const geolocateControl = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    });
    map.addControl(geolocateControl, 'top-right');

    geolocateControl.on('geolocate', (pos) => {
      const positionPayload = pos as unknown as { coords?: { latitude: number; longitude: number } };
      if (positionPayload.coords) {
        const roundedLat = Number(positionPayload.coords.latitude.toFixed(6));
        const roundedLng = Number(positionPayload.coords.longitude.toFixed(6));
        this.formLatitude.set(roundedLat);
        this.formLongitude.set(roundedLng);
        if (this.pickerMarker) {
          this.pickerMarker.setLngLat([roundedLng, roundedLat]);
        }
      }
    });

    const marker = new Marker({
      draggable: true,
      color: '#3b5bdb',
    })
      .setLngLat([lng, lat])
      .addTo(map);

    this.pickerMarker = marker;

    const updateCoords = (): void => {
      const pos = marker.getLngLat();
      this.formLatitude.set(Number(pos.lat.toFixed(6)));
      this.formLongitude.set(Number(pos.lng.toFixed(6)));
    };

    marker.on('drag', updateCoords);
    marker.on('dragend', updateCoords);

    map.on('click', (e) => {
      const { lng: clickLng, lat: clickLat } = e.lngLat;
      marker.setLngLat([clickLng, clickLat]);
      this.formLatitude.set(Number(clickLat.toFixed(6)));
      this.formLongitude.set(Number(clickLng.toFixed(6)));
    });

    // Múltiples pasadas de ajuste para asegurar que el canvas no quede gris tras la transición del modal
    setTimeout(() => map.resize(), 100);
    map.on('load', () => {
      setTimeout(() => map.resize(), 150);
      setTimeout(() => map.resize(), 350);
    });
  }

  /**
   * Destruye la instancia del mapa y el puntero para liberar memoria WebGL.
   */
  private destroyPickerMap(): void {
    if (this.mapInitTimeout) {
      clearTimeout(this.mapInitTimeout);
      this.mapInitTimeout = null;
    }
    if (this.pickerMarker) {
      this.pickerMarker.remove();
      this.pickerMarker = null;
    }
    if (this.pickerMap) {
      this.pickerMap.remove();
      this.pickerMap = null;
    }
  }

  /**
   * Actualiza las coordenadas desde los campos de texto y sincroniza el puntero del mapa.
   * @param coord Coordenada modificada ('lat' o 'lng').
   * @param event Evento de entrada de texto.
   */
  public onCoordinateInput(coord: 'lat' | 'lng', event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    if (isNaN(val)) return;

    if (coord === 'lat') {
      this.formLatitude.set(val);
    } else {
      this.formLongitude.set(val);
    }

    const currentLat = this.formLatitude();
    const currentLng = this.formLongitude();

    if (this.pickerMarker) {
      this.pickerMarker.setLngLat([currentLng, currentLat]);
    }
    if (this.pickerMap) {
      this.pickerMap.panTo([currentLng, currentLat]);
    }
  }

  /**
   * Cierra el modal y limpia el mapa WebGL.
   */
  public closeModal(): void {
    this.destroyPickerMap();
    this.isModalOpen.set(false);
  }

  /**
   * Actualiza el valor de un campo de texto de forma tipada.
   * @param targetSignal Señal a modificar.
   * @param event Evento del input.
   */
  public onInputChange(targetSignal: { set: (val: string) => void }, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) targetSignal.set(input.value);
  }

  /**
   * Actualiza el valor de un textarea de forma tipada.
   * @param targetSignal Señal a modificar.
   * @param event Evento del textarea.
   */
  public onTextAreaChange(targetSignal: { set: (val: string) => void }, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) targetSignal.set(textarea.value);
  }

  /**
   * Actualiza un valor numérico de forma tipada.
   * @param targetSignal Señal numérica a modificar.
   * @param event Evento de input.
   */
  public onNumberChange(targetSignal: { set: (val: number) => void }, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) targetSignal.set(parseFloat(input.value) || 0);
  }

  /**
   * Guarda o actualiza el POI en el backend.
   */
  public onSavePoi(): void {
    if (!this.formTitle().trim() || !this.formDescription().trim()) {
      this.toastMessage.set('Título y descripción del POI son obligatorios.');
      this.showToast.set(true);
      return;
    }

    this.isSubmitting.set(true);
    const editing = this.editingPoi();
    const photoUrls = this.formPhotosRaw()
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (editing) {
      const dto: AdminUpdatePoiDto = {
        routeId: editing.routeId || this.selectedRouteId() || null,
        title: this.formTitle().trim(),
        description: this.formDescription().trim(),
        orderIndex: Number(this.formOrderIndex()),
        latitude: Number(this.formLatitude()),
        longitude: Number(this.formLongitude()),
        audioUrl: this.formAudioUrl().trim() || null,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      };

      this.adminService
        .updatePoi(editing.id, dto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeModal();
            this.toastMessage.set('Punto de interés actualizado correctamente.');
            this.showToast.set(true);
            this.fetchPois();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toastMessage.set('Error al actualizar el punto de interés.');
            this.showToast.set(true);
          },
        });
    } else {
      const dto: AdminCreatePoiDto = {
        routeId: this.selectedRouteId() || null,
        title: this.formTitle().trim(),
        description: this.formDescription().trim(),
        orderIndex: Number(this.formOrderIndex()),
        latitude: Number(this.formLatitude()),
        longitude: Number(this.formLongitude()),
        audioUrl: this.formAudioUrl().trim() || null,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      };

      this.adminService
        .createPoi(dto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.closeModal();
            this.toastMessage.set('Punto de interés creado y georreferenciado.');
            this.showToast.set(true);
            this.fetchPois();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toastMessage.set('Error al crear el punto de interés.');
            this.showToast.set(true);
          },
        });
    }
  }

  /**
   * Elimina un POI tras confirmación.
   * @param poi POI a eliminar.
   */
  public onDeletePoi(poi: AdminPoi): void {
    if (confirm(`¿Eliminar el punto de interés "${poi.title}"?`)) {
      this.adminService
        .deletePoi(poi.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.pois.update((list) => list.filter((p) => p.id !== poi.id));
            this.toastMessage.set('Punto de interés eliminado.');
            this.showToast.set(true);
          },
        });
    }
  }

  /**
   * Obtiene la posición GPS actual del dispositivo y sincroniza el puntero del mapa y los campos del formulario.
   */
  public async loadCurrentGpsLocation(): Promise<void> {
    this.isLocatingGps.set(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Fallback resiliente a la API nativa de geolocalización del navegador
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          const browserPos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          lat = browserPos.coords.latitude;
          lng = browserPos.coords.longitude;
        }
      }

      if (lat !== null && lng !== null) {
        const roundedLat = Number(lat.toFixed(6));
        const roundedLng = Number(lng.toFixed(6));

        this.formLatitude.set(roundedLat);
        this.formLongitude.set(roundedLng);

        if (this.pickerMarker) {
          this.pickerMarker.setLngLat([roundedLng, roundedLat]);
        }
        if (this.pickerMap) {
          this.pickerMap.flyTo({
            center: [roundedLng, roundedLat],
            zoom: 17,
            essential: true,
          });
        }

        this.toastMessage.set('Ubicación GPS obtenida y fijada en el mapa con éxito.');
        this.showToast.set(true);
      } else {
        throw new Error('Coordenadas GPS no disponibles');
      }
    } catch {
      this.toastMessage.set(
        'No fue posible obtener la ubicación GPS. Verifique los permisos del dispositivo o fíjela manualmente.',
      );
      this.showToast.set(true);
    } finally {
      this.isLocatingGps.set(false);
    }
  }
}
