/**
 * @sdd
 * [Objetivo]: Servicio de gestion de estado volatil y telemetria en memoria rapida Redis (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Expone metodos saveUserLocation, getAllLiveLocations y removeUserLocation usando comandos GEOADD y TTL de 10 min.
 * [Edge Cases]: Reconexion automatica ante caida del contenedor Redis, control de excepciones sin bloquear el hilo WebSocket.
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 *
 */
export interface RedisTelemetryPayload {
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
  batteryLevel?: number | null;
  /**
   *
   */
  isSos?: boolean;
  /**
   *
   */
  sosMessage?: string | null;
  /**
   *
   */
  timestamp: number;
}

/**
 * Servicio encargado de la interaccion directa con el cluster o instancia de Redis.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  /**
   *
   */
  private readonly logger = new Logger(RedisService.name);
  /**
   *
   */
  private readonly client: Redis;

  /**
   *
   */
  private readonly TTL_SECONDS = 600; // 10 minutos
  /**
   *
   */
  private readonly GEO_KEY = 'live_locations';

  /**
   *
   * @param configService
   */
  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.client = new Redis({
      host,
      port,
      lazyConnect: false,
      /**
       *
       * @param times
       */
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on('connect', () => {
      this.logger.log(`Conexión establecida con Redis en ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.error(`Error en cliente Redis: ${err.message}`);
    });
  }

  /**
   * Guarda o actualiza la coordenada de un usuario en Redis con TTL de 10 minutos y actualiza el indice GEO.
   * @param payload Datos de telemetria del usuario.
   */
  async saveUserLocation(payload: RedisTelemetryPayload): Promise<void> {
    try {
      const key = `user:location:${payload.userId}`;
      const serialized = JSON.stringify(payload);

      // Hot State: Guardar clave individual con TTL de 10 minutos
      await this.client.set(key, serialized, 'EX', this.TTL_SECONDS);

      // Indice geoespacial en vivo: GEOADD live_locations <lng> <lat> <member>
      await this.client.geoadd(this.GEO_KEY, payload.longitude, payload.latitude, payload.userId);
    } catch (error) {
      this.logger.error(`Error al persistir telemetria en Redis: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene la fotografia instantanea de todas las ubicaciones activas actualmente en memoria.
   * @returns Lista de telemetrias activas.
   */
  async getAllLiveLocations(): Promise<RedisTelemetryPayload[]> {
    try {
      const keys = await this.client.keys('user:location:*');
      if (keys.length === 0) {
        return [];
      }

      const rawValues = await this.client.mget(keys);
      const results: RedisTelemetryPayload[] = [];

      for (const val of rawValues) {
        if (val) {
          try {
            results.push(JSON.parse(val) as RedisTelemetryPayload);
          } catch {
            // Omitir valor invalido
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Error al obtener snapshot de ubicaciones en Redis: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Elimina un usuario del estado activo en Redis.
   * @param userId UUID del usuario.
   */
  async removeUserLocation(userId: string): Promise<void> {
    try {
      await this.client.del(`user:location:${userId}`);
      await this.client.zrem(this.GEO_KEY, userId);
    } catch (error) {
      this.logger.error(`Error al remover usuario de Redis: ${(error as Error).message}`);
    }
  }

  /**
   * Cierra ordenadamente la conexion con Redis al detener la aplicacion.
   */
  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
