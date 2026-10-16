/**
 * @sdd
 * [Objetivo]: Servicio de logica de negocio para telemetria dual (Hot/Cold), calculo de ruta y gestion SOS (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Inyecta Repository<TelemetryLog> y RedisService. Expone metodos de procesamiento y calculo geoespacial al punto de encuentro.
 * [Edge Cases]: Persistencia en BD solo cada 60s por usuario salvo en eventos criticos (SOS). Calculo seguro con formula de Haversine.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryLog } from './entities/telemetry-log.entity.js';
import { Route } from '../routes/entities/route.entity.js';
import { Waypoint } from '../routes/entities/waypoint.entity.js';
import { RedisService, RedisTelemetryPayload } from '../redis/redis.service.js';

/**
 *
 */
export interface MeetingPointDetails {
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
export interface RouteNavigationResult {
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
  destination: MeetingPointDetails;
  /**
   *
   */
  distanceMeters: number;
  /**
   *
   */
  distanceKm: string;
  /**
   * Tiempo estimado de caminata en minutos a velocidad promedio peatonal (~4.5 km/h).
   */
  estimatedWalkingMinutes: number;
  /**
   * Tiempo estimado en automóvil en minutos a velocidad urbana promedio (~30 km/h).
   */
  estimatedDrivingMinutes: number;
  /**
   * URL directa a Google Maps con origen y destino.
   */
  googleMapsUrl: string;
  /**
   * URL directa a Waze.
   */
  wazeUrl: string;
}

export const OFFICIAL_MEETING_POINT: MeetingPointDetails = {
  name: 'Parque Principal La Libertad',
  latitude: 6.9877,
  longitude: -73.0501,
  address: 'Calle 9 # 7-15, Centro, Piedecuesta, Santander',
  description: 'Punto de encuentro oficial y registro para las rutas de guianza turística de Piedecuesta.',
};

/**
 * Servicio encargado de la gestion de ubicaciones en vivo y persistencia historica de telemetria.
 */
@Injectable()
export class TelemetryService {
  /**
   *
   */
  private readonly logger = new Logger(TelemetryService.name);

  // Registro en memoria de la ultima persistencia en base de datos relacional por usuario (ms)
  /**
   *
   */
  private readonly lastColdPersistByUser = new Map<string, number>();
  /**
   *
   */
  private readonly COLD_THROTTLE_MS = 60000; // 60 segundos

  /**
   * Constructor con inyección de repositorios y cliente Redis.
   * @param telemetryLogRepository Repositorio de logs de telemetría.
   * @param routeRepository Repositorio de rutas turísticas.
   * @param waypointRepository Repositorio de puntos de interés.
   * @param redisService Servicio de almacenamiento en caché Redis.
   */
  constructor(
    @InjectRepository(TelemetryLog)
    private readonly telemetryLogRepository: Repository<TelemetryLog>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Waypoint)
    private readonly waypointRepository: Repository<Waypoint>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Procesa una actualizacion de posicion aplicando la persistencia dual (Hot State en Redis y Cold State en Postgres).
   * @param payload Datos de telemetria del usuario.
   */
  async processLocationUpdate(payload: RedisTelemetryPayload): Promise<void> {
    // 1. Hot State: Actualizacion inmediata en Redis (TTL 10 min y GEOADD)
    await this.redisService.saveUserLocation(payload);

    // 2. Cold State: Auditoria en PostgreSQL solo cada 60s o si es evento critico (SOS)
    const now = Date.now();
    const lastSaved = this.lastColdPersistByUser.get(payload.userId) || 0;
    const shouldSaveCold = payload.isSos || now - lastSaved >= this.COLD_THROTTLE_MS;

    if (shouldSaveCold) {
      this.lastColdPersistByUser.set(payload.userId, now);
      await this.saveColdLog(payload);
    }
  }

  /**
   * Persiste un registro historico en la tabla telemetry_logs de PostgreSQL/PostGIS.
   * @param payload Datos de telemetria.
   */
  private async saveColdLog(payload: RedisTelemetryPayload): Promise<void> {
    try {
      const log = this.telemetryLogRepository.create({
        userId: payload.userId,
        location: {
          type: 'Point',
          coordinates: [payload.longitude, payload.latitude],
        },
        altitude: payload.altitude ?? null,
        speed: payload.speed ?? null,
        heading: payload.heading ?? null,
        accuracy: payload.accuracy ?? null,
        batteryLevel: payload.batteryLevel ?? null,
        isSos: payload.isSos ?? false,
        sosMessage: payload.sosMessage ?? null,
      });

      await this.telemetryLogRepository.save(log);
    } catch (error) {
      this.logger.error(`Error al persistir Cold State en Postgres: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene la fotografia instantanea de todos los usuarios activos desde Redis sin consultar PostgreSQL.
   * @returns Lista de telemetrias activas en memoria.
   */
  async getLiveSnapshot(): Promise<RedisTelemetryPayload[]> {
    return this.redisService.getAllLiveLocations();
  }

  /**
   * Calcula la distancia, tiempo estimado de caminata, tiempo en carro y enlaces de navegacion hacia el punto principal establecido de la ruta.
   * @param userLat Latitud actual del usuario.
   * @param userLng Longitud actual del usuario.
   * @param routeId Identificador opcional de la ruta para calcular hacia su punto de inicio.
   * @returns Calculo de distancia, tiempos de caminata y vehiculo, y URLs directas a Google Maps / Waze.
   */
  async calculateHowToArrive(
    userLat: number,
    userLng: number,
    routeId?: string,
  ): Promise<RouteNavigationResult> {
    let destination: MeetingPointDetails = OFFICIAL_MEETING_POINT;

    // 1. Obtener la ruta objetivo (especificada o la activa)
    let targetRoute: Route | null = null;
    try {
      if (routeId) {
        targetRoute = await this.routeRepository.findOne({ where: { id: routeId } });
      } else {
        targetRoute = await this.routeRepository.findOne({ where: { isActive: true } });
      }
    } catch (err) {
      this.logger.warn(`Error al consultar ruta para how-to-arrive: ${(err as Error).message}`);
    }

    // 2. Determinar el punto principal establecido de la ruta
    if (targetRoute) {
      try {
        // Buscar el primer punto de interés de la ruta en la tabla waypoints
        const [firstWaypoint] = await this.waypointRepository.find({
          where: { routeId: targetRoute.id },
          order: { orderIndex: 'ASC' },
          take: 1,
        });

        if (firstWaypoint && firstWaypoint.location && firstWaypoint.location.coordinates) {
          destination = {
            name: firstWaypoint.title,
            latitude: firstWaypoint.location.coordinates[1],
            longitude: firstWaypoint.location.coordinates[0],
            address: targetRoute.municipality || 'Piedecuesta, Santander',
            description: firstWaypoint.description || targetRoute.description,
          };
        } else if (targetRoute.coordinates && targetRoute.coordinates.length > 0) {
          destination = {
            name: targetRoute.name,
            latitude: targetRoute.coordinates[0][1],
            longitude: targetRoute.coordinates[0][0],
            address: targetRoute.municipality || 'Piedecuesta, Santander',
            description: `Punto de inicio oficial del recorrido: ${targetRoute.name}`,
          };
        }
      } catch (err) {
        this.logger.warn(`Error al resolver punto de inicio de la ruta: ${(err as Error).message}`);
      }
    }

    // 3. Formula de Haversine para distancia ortodromica en metros
    const R = 6371e3;
    const radLat1 = (userLat * Math.PI) / 180;
    const radLat2 = (destination.latitude * Math.PI) / 180;
    const deltaLat = ((destination.latitude - userLat) * Math.PI) / 180;
    const deltaLng = ((destination.longitude - userLng) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = Math.round(R * c);
    const distanceKm = (distanceMeters / 1000).toFixed(2);

    // 4. Estimacion de caminata a velocidad promedio de 4.5 km/h (~75 m/min)
    const estimatedWalkingMinutes = Math.max(1, Math.round(distanceMeters / 75));

    // 5. Estimacion en carro a velocidad urbana de 30 km/h (~500 m/min) con factor de trazado vial de 1.25
    const estimatedDrivingMinutes = Math.max(1, Math.round((distanceMeters * 1.25) / 500));

    // 6. Enlaces de navegacion con origen exacto del usuario y destino
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destination.latitude},${destination.longitude}`;
    const wazeUrl = `https://waze.com/ul?ll=${destination.latitude},${destination.longitude}&navigate=yes`;

    return {
      origin: {
        latitude: userLat,
        longitude: userLng,
      },
      destination,
      distanceMeters,
      distanceKm,
      estimatedWalkingMinutes,
      estimatedDrivingMinutes,
      googleMapsUrl,
      wazeUrl,
    };
  }
}
