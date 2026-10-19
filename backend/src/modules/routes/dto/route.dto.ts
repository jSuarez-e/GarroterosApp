/**
 * @sdd
 * [Objetivo]: DTOs e interfaces de respuesta para el modulo de rutas, POIs y clima en backend (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Expone PoiDto, RoutePathDto, WeatherReportDto y sus subtipos para documentacion Swagger y serializacion REST.
 * [Edge Cases]: Tipos estrictos sin 'any', coordenadas en formato [lng, lat] para GeoJSON y [lat, lng] para POI center.
 */

/**
 *
 */
export interface PoiLocationDto {
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
  location: PoiLocationDto;
  /**
   *
   */
  audioUrl?: string | null;
  /**
   *
   */
  photoUrls?: string[];
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
  /**
   *
   */
  coordinates: [number, number][];
  /**
   * Hora de inicio programada del recorrido
   */
  startTime?: string | null;
  /**
   * Fecha de inicio programada (YYYY-MM-DD)
   */
  startDate?: string | null;
  /**
   * Fecha de finalización programada (YYYY-MM-DD)
   */
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
