/**
 * @sdd
 * [Objetivo]: Contratos e interfaces compartidas para telemetria GPS en tiempo real, Redis y SOS (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Exporta GpsLocation, TelemetryPayload, SosAlertPayload, MeetingPointInfo, HowToArriveCalculation y TelemetrySocketEvents.
 * [Edge Cases]: Tipos estrictos sin any, coordenadas obligatorias con precision y marcas de tiempo validas.
 */

/**
 *
 */
export interface GpsLocation {
  /**
   *
   */
  latitude: number;
  /**
   *
   */
  longitude: number;
  /**
   *
   */
  altitude?: number | null;
  /**
   *
   */
  accuracy?: number | null;
  /**
   *
   */
  speed?: number | null;
  /**
   *
   */
  heading?: number | null;
  /**
   *
   */
  timestamp: number;
}

/**
 *
 */
export interface TelemetryPayload extends GpsLocation {
  /**
   *
   */
  userId: string;
  /**
   *
   */
  fullName: string;
  /**
   *
   */
  role: string;
  /**
   *
   */
  batteryLevel?: number | null;
  /**
   *
   */
  isSos?: boolean;
  /**
   *
   */
  sosMessage?: string | null;
}

/**
 *
 */
export interface SosAlertPayload {
  /**
   *
   */
  userId: string;
  /**
   *
   */
  fullName: string;
  /**
   *
   */
  role: string;
  /**
   *
   */
  latitude: number;
  /**
   *
   */
  longitude: number;
  /**
   *
   */
  batteryLevel?: number | null;
  /**
   *
   */
  message: string;
  /**
   *
   */
  timestamp: number;
}

/**
 *
 */
export interface MeetingPointInfo {
  /**
   *
   */
  name: string;
  /**
   *
   */
  latitude: number;
  /**
   *
   */
  longitude: number;
  /**
   *
   */
  address: string;
  /**
   *
   */
  description: string;
}

/**
 *
 */
export interface HowToArriveCalculation {
  /**
   *
   */
  origin: {
    /**
     *
     */
    latitude: number;
    /**
     *
     */
    longitude: number;
  };
  /**
   *
   */
  destination: MeetingPointInfo;
  /**
   *
   */
  distanceMeters: number;
  /**
   *
   */
  distanceKm: string;
  /**
   * Tiempo estimado de caminata en minutos a velocidad promedio peatonal.
   */
  estimatedWalkingMinutes: number;
  /**
   * Tiempo estimado de trayecto en automóvil en minutos a velocidad urbana.
   */
  estimatedDrivingMinutes: number;
  /**
   *
   */
  googleMapsUrl: string;
  /**
   *
   */
  wazeUrl: string;
}

export enum TelemetrySocketEvents {
  LOCATION_UPDATE = 'location_update',
  LIVE_LOCATIONS_SNAPSHOT = 'live_locations_snapshot',
  USER_LOCATION_BROADCAST = 'user_location_broadcast',
  SOS_TRIGGER = 'sos_trigger',
  SOS_BROADCAST = 'sos_broadcast',
}
