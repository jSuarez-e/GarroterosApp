/**
 * @sdd
 * [Objetivo]: Servicio de telemetria GPS en segundo plano con optimizacion de bateria, fallback web y canal SOS (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Expone senales currentLocation, isTracking, liveLocations, activeSosAlert; metodos startTracking, stopTracking, triggerSos.
 * [Edge Cases]: Foreground Service nativo con distancia minima de 10m y throttle de 5s; fallback transparente a navigator.geolocation.watchPosition en navegadores.
 */

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom, Observable } from 'rxjs';
import { SocketService } from './socket.service';
import { AuthService } from './auth.service';
import { AppLogger } from '../utils/logger';
import { environment } from '../../../environments/environment';
import { SosAlertStatus, type ISosAlertEntry, type CreateSosTriggerDto } from '../../../../../shared/src/index';

export interface GpsLocation {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface TelemetryPayload extends GpsLocation {
  userId: string;
  fullName: string;
  role: string;
  batteryLevel?: number | null;
  isSos?: boolean;
  sosMessage?: string | null;
}

export interface SosAlertPayload extends TelemetryPayload {
  message: string;
}

export interface HowToArriveData {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    description: string;
  };
  distanceMeters: number;
  distanceKm: string;
  estimatedWalkingMinutes: number;
  estimatedDrivingMinutes: number;
  googleMapsUrl: string;
  wazeUrl: string;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundTitle?: string;
      backgroundMessage?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (location: GpsLocation | null, error: Error | null) => void,
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  'BackgroundGeolocation',
);

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private readonly socketService = inject(SocketService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  // Senales de estado reactivo
  public isTracking = signal<boolean>(false);
  public currentLocation = signal<GpsLocation | null>(null);
  public liveLocations = signal<Map<string, TelemetryPayload>>(new Map());
  public activeSosAlert = signal<SosAlertPayload | null>(null);

  private watcherId: string | null = null;
  private webWatcherId: number | null = null;

  // Optimizacion: throttle minimo de 5 segundos entre emisiones
  private lastEmitTime = 0;
  private readonly MIN_THROTTLE_MS = 5000;
  private readonly DISTANCE_FILTER_METERS = 10;

  constructor() {
    this.setupSocketListeners();
  }

  /**
   * Configura los listeners del WebSocket para recibir actualizaciones y alertas SOS en tiempo real.
   */
  private setupSocketListeners(): void {
    // Snapshot inicial de Redis al conectar
    this.socketService.on<TelemetryPayload[]>('live_locations_snapshot', (snapshot) => {
      const map = new Map<string, TelemetryPayload>();
      for (const loc of snapshot) {
        map.set(loc.userId, loc);
      }
      this.liveLocations.set(map);
      AppLogger.log(`[Telemetry] Snapshot recibido con ${snapshot.length} usuarios activos.`);
    });

    // Difusion de movimiento de cualquier usuario
    this.socketService.on<TelemetryPayload>('user_location_broadcast', (update) => {
      const map = new Map(this.liveLocations());
      map.set(update.userId, update);
      this.liveLocations.set(map);
    });

    // Difusion prioritaria de alerta SOS
    this.socketService.on<SosAlertPayload>('sos_broadcast', async (alert) => {
      this.activeSosAlert.set(alert);
      const updatedLocations = new Map(this.liveLocations());
      updatedLocations.set(alert.userId, alert);
      this.liveLocations.set(updatedLocations);
      AppLogger.warn(`[SOS RECIBIDO] Emergencia de ${alert.fullName}: ${alert.message}`);

      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch {
        // En web sin soporte de vibracion
      }
    });
  }

  /**
   * Inicia el rastreo GPS en segundo plano con Foreground Service o fallback en Web.
   */
  public async startTracking(): Promise<void> {
    if (this.isTracking()) return;

    const user = this.authService.currentUser();
    const token = this.authService.token();

    if (token) {
      this.socketService.connect(token);
    }

    this.isTracking.set(true);

    if (Capacitor.isNativePlatform()) {
      await this.startNativeBackgroundTracking();
    } else {
      this.startWebTrackingFallback();
    }

    AppLogger.log('[Telemetry] Rastreo GPS iniciado correctamente.');
  }

  /**
   * Rastreo nativo en Android/iOS con Foreground Service persistente.
   */
  private async startNativeBackgroundTracking(): Promise<void> {
    try {
      this.watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'Ruta Piedecuesta activa',
          backgroundMessage: 'Compartiendo ubicación con los guías',
          requestPermissions: true,
          stale: false,
          distanceFilter: this.DISTANCE_FILTER_METERS,
        },
        (location, error) => {
          if (error) {
            AppLogger.error(`[BackgroundGeolocation Error]: ${error.message}`);
            return;
          }
          if (location) {
            this.handleNewCoordinates(location);
          }
        },
      );
    } catch (err) {
      AppLogger.error(`[Native Tracking Failed]: ${(err as Error).message}`);
      // Fallback a API del navegador
      this.startWebTrackingFallback();
    }
  }

  /**
   * Fallback para desarrollo web (ionic serve) mediante navigator.geolocation.
   */
  private startWebTrackingFallback(): void {
    if (!navigator.geolocation) {
      AppLogger.warn('[Telemetry] Geolocation no soportada en este entorno.');
      return;
    }

    this.webWatcherId = navigator.geolocation.watchPosition(
      (position) => {
        const location: GpsLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };
        this.handleNewCoordinates(location);
      },
      (err) => {
        AppLogger.error(`[Web Geolocation Error]: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );
  }

  /**
   * Filtra por distancia y tiempo antes de emitir por WebSocket.
   * @param location Nuevas coordenadas GPS.
   */
  private handleNewCoordinates(location: GpsLocation): void {
    this.currentLocation.set(location);

    const now = Date.now();
    if (now - this.lastEmitTime < this.MIN_THROTTLE_MS) {
      return;
    }

    this.lastEmitTime = now;
    const user = this.authService.currentUser();
    if (!user) return;

    this.socketService.emit('location_update', {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      timestamp: location.timestamp,
    });
  }

  /**
   * Detiene el rastreo y libera los recursos del plugin nativo y del socket.
   */
  public async stopTracking(): Promise<void> {
    if (!this.isTracking()) return;

    if (this.watcherId) {
      await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      this.watcherId = null;
    }

    if (this.webWatcherId !== null) {
      navigator.geolocation.clearWatch(this.webWatcherId);
      this.webWatcherId = null;
    }

    this.isTracking.set(false);
    AppLogger.log('[Telemetry] Rastreo GPS detenido.');
  }

  /**
   * Emite una alerta de emergencia SOS con coordenadas exactas a todos los administradores via REST y WebSocket.
   * @param message Mensaje opcional describiendo la situacion.
   * @returns Alerta SOS persistida en base de datos.
   */
  public async triggerSos(message: string): Promise<ISosAlertEntry> {
    const token = this.authService.token();
    const currentUser = this.authService.currentUser();

    // Asegurar conexion WebSocket si no esta activa
    if (token && !this.socketService.isConnected()) {
      this.socketService.connect(token);
    }

    // Intentar refrescar coordenadas GPS actuales con timeout
    let coords = this.currentLocation();
    if (!coords) {
      coords = await this.getCurrentPosition();
    }

    const lat = coords?.latitude || 6.9877;
    const lng = coords?.longitude || -73.0501;
    const altitude = coords?.altitude ?? null;

    let batteryLevel: number | null = null;
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const battery = await (navigator as unknown as { getBattery: () => Promise<{ level: number }> }).getBattery();
        batteryLevel = Math.round(battery.level * 100);
      }
    } catch {
      // Ignorar si navigator.getBattery no está soportado en la plataforma
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Ignorar si no hay soporte de haptics
    }

    const payload: CreateSosTriggerDto = {
      latitude: lat,
      longitude: lng,
      altitude,
      batteryLevel,
      message,
      timestamp: Date.now(),
    };

    // 1. Enviar prioritariamente via HTTP POST para garantizar persistencia en BD y difusion oficial
    try {
      const result = await firstValueFrom(
        this.http.post<ISosAlertEntry>(`${environment.apiUrl}/telemetry/sos`, payload),
      );

      // 2. Actualizar estado local reactivo
      const alertPayload: SosAlertPayload = {
        userId: currentUser?.id || result.userId,
        fullName: currentUser?.fullName || result.userName,
        role: currentUser?.role || 'USER',
        latitude: lat,
        longitude: lng,
        altitude,
        batteryLevel,
        isSos: true,
        sosMessage: message,
        timestamp: payload.timestamp || Date.now(),
        message,
      };
      this.activeSosAlert.set(alertPayload);

      return result;
    } catch (httpError) {
      // 3. Fallback de contingencia: si HTTP falla y el socket está activo, emitir vía WebSocket
      if (this.socketService.isConnected()) {
        AppLogger.warn('[Telemetry] Fallo HTTP SOS. Transmitiendo por canal de contingencia WebSocket.');
        this.socketService.emit('sos_trigger', payload);
        const fallbackResult: ISosAlertEntry = {
          id: `fallback-${Date.now()}`,
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.fullName || 'Usuario',
          userEmail: currentUser?.email || null,
          userPhone: currentUser?.phone || null,
          latitude: lat,
          longitude: lng,
          altitude,
          batteryLevel,
          message,
          status: SosAlertStatus.PENDING,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolvedById: null,
          resolvedByName: null,
          resolutionNote: null,
        };
        const alertPayload: SosAlertPayload = {
          userId: fallbackResult.userId,
          fullName: fallbackResult.userName,
          role: currentUser?.role || 'USER',
          latitude: lat,
          longitude: lng,
          altitude,
          batteryLevel,
          isSos: true,
          sosMessage: message,
          timestamp: payload.timestamp || Date.now(),
          message,
        };
        this.activeSosAlert.set(alertPayload);
        return fallbackResult;
      }
      throw httpError;
    }
  }

  /**
   * Descarta la alerta activa en la interfaz visual.
   */
  public dismissSosAlert(): void {
    this.activeSosAlert.set(null);
  }

  /**
   * Obtiene la posición GPS puntual actual del dispositivo usando @capacitor/geolocation
   * con fallback seguro a la API estándar navigator.geolocation.
   * @returns Promesa con la ubicación GPS o null si no se pudo determinar.
   */
  public async getCurrentPosition(): Promise<GpsLocation | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });

      const loc: GpsLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      };

      this.currentLocation.set(loc);
      return loc;
    } catch (err) {
      AppLogger.warn(`[Telemetry] Error obteniendo GPS actual con plugin nativo: ${err}`);
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        return new Promise<GpsLocation | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc: GpsLocation = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                altitude: pos.coords.altitude,
                accuracy: pos.coords.accuracy,
                speed: pos.coords.speed,
                heading: pos.coords.heading,
                timestamp: pos.timestamp,
              };
              this.currentLocation.set(loc);
              resolve(loc);
            },
            () => resolve(this.currentLocation()),
            { enableHighAccuracy: true, timeout: 8000 },
          );
        });
      }
      return this.currentLocation();
    }
  }

  /**
   * Consulta al backend el calculo de ruta y enlaces directos a Google Maps y Waze.
   * @param lat Latitud origen.
   * @param lng Longitud origen.
   * @param routeId Identificador opcional de la ruta para calcular hacia su punto principal.
   * @returns Observable con los detalles de navegacion.
   */
  public getHowToArrive(
    lat: number,
    lng: number,
    routeId?: string,
  ): Observable<HowToArriveData> {
    const routeQuery = routeId ? `&routeId=${encodeURIComponent(routeId)}` : '';
    return this.http.get<HowToArriveData>(
      `${environment.apiUrl}/telemetry/how-to-arrive?lat=${lat}&lng=${lng}${routeQuery}`,
    );
  }
}

