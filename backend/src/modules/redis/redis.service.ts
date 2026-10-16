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
   * Instancia de registro para auditoría de Redis.
   */
  private readonly logger = new Logger(RedisService.name);

  /**
   * Cliente de conexión con el motor Redis (opcional si opera en modo degradado).
   */
  private readonly client: Redis | null = null;

  /**
   * Almacén en memoria como respaldo resiliente si Redis no está aprovisionado o está desconectado.
   */
  private readonly inMemoryStore = new Map<string, RedisTelemetryPayload>();

  /**
   * Bandera que determina si la conexión con Redis se encuentra activa y saludable.
   */
  private isConnected = false;

  /**
   * Tiempo de vida en segundos de la ubicación del usuario (10 minutos).
   */
  private readonly TTL_SECONDS = 600;

  /**
   * Clave geoespacial para indexar las posiciones de los usuarios activos.
   */
  private readonly GEO_KEY = 'live_locations';

  /**
   * Inicializa la conexion con la instancia de Redis local o en la nube (Render / Upstash).
   * @param configService Servicio de configuracion de entorno.
   */
  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    /**
     * Estrategia de reconexion con tope de reintentos para no saturar registros.
     * @param retryAttemptNumber Numero de intentos acumulados.
     * @returns Tiempo de espera en milisegundos o null para detener reintentos.
     */
    const redisRetryStrategy = (retryAttemptNumber: number): number | null => {
      if (retryAttemptNumber > 5) {
        this.logger.warn('[RedisService] Límite de reconexión alcanzado. Continuando en modo de memoria.');
        return null;
      }
      return Math.min(retryAttemptNumber * 500, 2500);
    };

    if (redisUrl) {
      const isSecureTls = redisUrl.startsWith('rediss://');
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
        connectTimeout: 5000,
        retryStrategy: redisRetryStrategy,
        ...(isSecureTls ? { tls: { rejectUnauthorized: false } } : {}),
      });
      this.logger.log('Inicializando cliente Redis vía REDIS_URL en modo asíncrono no bloqueante...');
    } else if (!isProduction) {
      this.client = new Redis({
        host,
        port,
        ...(password ? { password } : {}),
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
        connectTimeout: 5000,
        retryStrategy: redisRetryStrategy,
      });
      this.logger.log(`Inicializando cliente Redis local en ${host}:${port}...`);
    } else {
      this.logger.warn(
        '[RedisService] REDIS_URL no está configurada en producción. Operando en modo degradado resiliente (In-Memory).',
      );
    }

    if (this.client) {
      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Conexión establecida con Redis ${redisUrl ? '(Cloud/Render)' : `en ${host}:${port}`}`);
      });

      this.client.on('error', (connectionError: Error) => {
        this.isConnected = false;
        this.logger.warn(`[RedisService] Evento de desconexión en Redis: ${connectionError.message}. Operando en memoria.`);
      });

      // Conexión asíncrona desacoplada del ciclo de arranque de NestJS
      this.client.connect().catch((connectionError: Error) => {
        this.isConnected = false;
        this.logger.warn(`[RedisService] No fue posible conectar con Redis (${connectionError.message}). Operando en memoria.`);
      });
    }
  }

  /**
   * Guarda o actualiza la coordenada de un usuario en Redis con TTL de 10 minutos y actualiza el indice GEO.
   * @param payload Datos de telemetria del usuario.
   */
  async saveUserLocation(payload: RedisTelemetryPayload): Promise<void> {
    this.inMemoryStore.set(payload.userId, payload);

    if (this.client && this.isConnected) {
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
  }

  /**
   * Obtiene la fotografia instantanea de todas las ubicaciones activas actualmente en memoria.
   * @returns Lista de telemetrias activas.
   */
  async getAllLiveLocations(): Promise<RedisTelemetryPayload[]> {
    if (this.client && this.isConnected) {
      try {
        const keys = await this.client.keys('user:location:*');
        if (keys.length === 0) {
          return Array.from(this.inMemoryStore.values());
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
        return Array.from(this.inMemoryStore.values());
      }
    }

    return Array.from(this.inMemoryStore.values());
  }

  /**
   * Elimina un usuario del estado activo en Redis.
   * @param userId UUID del usuario.
   */
  async removeUserLocation(userId: string): Promise<void> {
    this.inMemoryStore.delete(userId);

    if (this.client && this.isConnected) {
      try {
        await this.client.del(`user:location:${userId}`);
        await this.client.zrem(this.GEO_KEY, userId);
      } catch (error) {
        this.logger.error(`Error al remover usuario de Redis: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Cierra ordenadamente la conexion con Redis al detener la aplicacion.
   */
  onModuleDestroy(): void {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
