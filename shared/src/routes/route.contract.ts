/**
 * @sdd
 * [Objetivo]: Contratos e interfaces compartidas para Cartografia, POIs, Recorrido y Clima (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: DTOs compartidos para Waypoints, Polilinea GeoJSON, Reporte Meteorologico y Perfiles de Participantes.
 * [Edge Cases]: Tipos estrictos sin 'any', estructuras GeoJSON compatibles con MapLibre GL y RFC 7946.
 */

import type { IGuideProfile } from '../guides/guides.contract.js';

/**
 * Coordenadas geográficas de un punto de interés.
 */
export interface PoiLocation {
  /**
   *
   */
  latitude: number;
  /**
   *
   */
  longitude: number;
}

/**
 *
 */
export interface PoiDto {
  /**
   *
   */
  id: string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  description: string;
  /**
   *
   */
  orderIndex: number;
  /**
   *
   */
  location: PoiLocation;
  /**
   *
   */
  audioUrl?: string | null;
  /**
   *
   */
  photoUrls?: string[];
  /**
   * Identificador UUID de la ruta a la que pertenece el punto de interés.
   */
  routeId?: string | null;
  /**
   * Nombre de la ruta asociada para presentación visual.
   */
  routeName?: string;
}

/**
 *
 */
export interface RoutePathDto {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  municipality: string;
  /**
   *
   */
  description: string;
  /**
   *
   */
  totalDistanceKm: number;
  /**
   *
   */
  estimatedDurationMinutes: number;
  // Coordenadas GeoJSON en formato [longitud, latitud]
  /**
   *
   */
  coordinates: [number, number][];
  /** Hora de inicio programada (formato HH:mm o HH:mm AM/PM) */
  startTime?: string | null;
  /** Fecha de inicio programada (formato YYYY-MM-DD) */
  startDate?: string | null;
  /** Fecha final o de culminación (formato YYYY-MM-DD) */
  endDate?: string | null;
}

/**
 *
 */
export interface CurrentWeatherDto {
  /**
   *
   */
  temperature: number;
  /**
   *
   */
  relativeHumidity: number;
  /**
   *
   */
  precipitationProbability: number;
  /**
   *
   */
  weatherCode: number;
  /**
   *
   */
  weatherDescription: string;
  /**
   *
   */
  weatherIcon: string;
  /**
   *
   */
  windSpeed: number;
  /**
   *
   */
  time: string;
}

/**
 *
 */
export interface HourlyForecastDto {
  /**
   *
   */
  time: string;
  /**
   *
   */
  temperature: number;
  /**
   *
   */
  precipitationProbability: number;
  /**
   *
   */
  weatherCode: number;
  /**
   *
   */
  weatherDescription: string;
  /**
   *
   */
  weatherIcon: string;
}

/**
 *
 */
export interface WeatherReportDto {
  /**
   *
   */
  municipality: string;
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
  current: CurrentWeatherDto;
  /**
   *
   */
  hourly: HourlyForecastDto[];
  /**
   *
   */
  recommendations: string[];
  /**
   *
   */
  fetchedAt: string;
}

/**
 *
 */
export interface ParticipantProfileDto {
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
  role: 'ADMIN' | 'USER';
  /**
   *
   */
  batteryLevel?: number | null;
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
  updatedAt: string;
  /**
   *
   */
  isSos?: boolean;
}

/**
 * Entidad completa de ruta turística registrada en base de datos.
 */
export interface RouteEntityDto {
  /** Identificador único UUID */
  id: string;
  /** Nombre del recorrido */
  name: string;
  /** Municipio o región */
  municipality: string;
  /** Descripción detallada */
  description: string;
  /** Distancia total en kilómetros */
  totalDistanceKm: number;
  /** Duración estimada en minutos */
  estimatedDurationMinutes: number;
  /** Coordenadas GeoJSON [longitud, latitud] */
  coordinates: [number, number][];
  /** Indica si es la ruta oficial activa en la app */
  isActive: boolean;
  /** Hora de inicio programada (formato HH:mm o HH:mm AM/PM) */
  startTime?: string | null;
  /** Fecha de inicio programada (formato YYYY-MM-DD) */
  startDate?: string | null;
  /** Fecha final o de culminación (formato YYYY-MM-DD) */
  endDate?: string | null;
  /** Guías oficiales asignados al recorrido */
  guides?: IGuideProfile[];
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de actualización */
  updatedAt: string;
}

/**
 * Payload para crear una nueva ruta turística y asignarle guías oficiales.
 */
export interface CreateRouteDto {
  /** Nombre del recorrido */
  name: string;
  /** Municipio o región */
  municipality?: string;
  /** Descripción detallada */
  description: string;
  /** Distancia total en kilómetros */
  totalDistanceKm: number;
  /** Duración estimada en minutos */
  estimatedDurationMinutes: number;
  /** Coordenadas GeoJSON [longitud, latitud] */
  coordinates?: [number, number][];
  /** Si debe activarse como la ruta oficial */
  isActive?: boolean;
  /** Hora de inicio programada (formato HH:mm o HH:mm AM/PM) */
  startTime?: string | null;
  /** Fecha de inicio programada (formato YYYY-MM-DD) */
  startDate?: string | null;
  /** Fecha final o de culminación (formato YYYY-MM-DD) */
  endDate?: string | null;
  /** Lista de UUIDs de los guías asignados a este recorrido */
  guideIds: string[];
}

/**
 * Payload para actualización parcial de una ruta turística.
 */
export type UpdateRouteDto = Partial<CreateRouteDto>;
