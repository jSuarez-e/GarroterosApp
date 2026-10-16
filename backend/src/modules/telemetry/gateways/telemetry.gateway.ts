/**
 * @sdd
 * [Objetivo]: Gateway WebSocket en tiempo real para recepcion y difusion de telemetria GPS y alertas SOS (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Handshake con token JWT. Eventos location_update, sos_trigger; emite live_locations_snapshot, user_location_broadcast, sos_broadcast.
 * [Edge Cases]: Rechaza conexiones no autenticadas, snapshot instantaneo de Redis al conectar, difusion prioritaria de alertas SOS.
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TelemetryService } from '../telemetry.service.js';
import { RedisTelemetryPayload } from '../../redis/redis.service.js';
import { AdminAlertsService } from '../../admin/services/admin-alerts.service.js';

/**
 * Datos del usuario decodificados del token adjunto al socket.
 */
interface SocketUserData {
  /**
   * Identificador UUID del usuario.
   */
  sub: string;
  /**
   * Correo electronico.
   */
  email: string;
  /**
   * Rol asignado.
   */
  role: string;
  /**
   * Nombre completo del usuario.
   */
  fullName: string;
}

/**
 * DTO para recepcion de coordenadas y estado de hardware via socket.
 */
export interface IncomingLocationUpdateDto {
  /**
   * Latitud en grados decimales.
   */
  latitude: number;
  /**
   * Longitud en grados decimales.
   */
  longitude: number;
  /**
   * Altitud sobre el nivel del mar en metros.
   */
  altitude?: number | null;
  /**
   * Precision estimada de la coordenada en metros.
   */
  accuracy?: number | null;
  /**
   * Velocidad de desplazamiento en m/s.
   */
  speed?: number | null;
  /**
   * Rumbo o direccion de desplazamiento en grados.
   */
  heading?: number | null;
  /**
   * Nivel de bateria (0-100%).
   */
  batteryLevel?: number | null;
  /**
   * Marca de tiempo epoch en milisegundos.
   */
  timestamp?: number;
}

/**
 * DTO para recepcion de alertas de emergencia SOS via socket.
 */
export interface IncomingSosTriggerDto {
  /**
   * Latitud de la emergencia.
   */
  latitude: number;
  /**
   * Longitud de la emergencia.
   */
  longitude: number;
  /**
   * Nivel de bateria del dispositivo emisor.
   */
  batteryLevel?: number | null;
  /**
   * Mensaje descriptivo de la alerta.
   */
  message?: string;
  /**
   * Marca de tiempo epoch en milisegundos.
   */
  timestamp?: number;
}

/**
 * Gateway WebSocket para la transmision bidireccional de telemetria en tiempo real.
 */
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:8100,http://localhost:4200,capacitor://localhost,https://localhost,http://localhost').split(',').map((o) => o.trim()),
    credentials: true,
  },
})
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /**
   * Instancia del servidor Socket.io.
   */
  @WebSocketServer()
  server!: Server;

  /**
   * Registrador de eventos de infraestructura de sockets.
   */
  private readonly logger = new Logger(TelemetryGateway.name);

  /**
   * Constructor del gateway inyectando servicios de token, configuracion y telemetria.
   * @param jwtService Servicio de verificacion JWT.
   * @param configService Servicio de configuracion de entorno.
   * @param telemetryService Servicio de procesamiento de ubicaciones.
   * @param adminAlertsService Servicio para persistencia y auditoria de alertas SOS.
   */
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly telemetryService: TelemetryService,
    private readonly adminAlertsService: AdminAlertsService,
  ) {}

  /**
   * Valida la autenticacion del cliente durante el handshake y envia la fotografia inicial desde Redis.
   * @param client Socket del cliente entrante.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const authHeader = (client.handshake.auth?.token || client.handshake.headers?.authorization) as string | undefined;
      const token = authHeader?.replace(/^Bearer\s+/i, '');

      if (!token) {
        this.logger.warn(`Conexión rechazada: Socket ${client.id} no proporcionó token`);
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET no configurado en variables de entorno');
      }
      const payload = this.jwtService.verify<SocketUserData>(token, { secret });

      client.data.user = payload;
      this.logger.log(`Cliente autenticado conectado: ${payload.fullName} (${payload.role})`);

      // Enviar snapshot de todas las ubicaciones activas desde Redis
      const snapshot = await this.telemetryService.getLiveSnapshot();
      client.emit('live_locations_snapshot', snapshot);
    } catch (error) {
      this.logger.warn(`Fallo en autenticación de socket ${client.id}: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  /**
   * Notifica la desconexion de un usuario.
   * @param client Socket del cliente saliente.
   */
  handleDisconnect(client: Socket): void {
    const user = client.data?.user as SocketUserData | undefined;
    if (user) {
      this.logger.log(`Cliente desconectado: ${user.fullName} (${client.id})`);
    }
  }

  /**
   * Recibe una actualizacion de coordenadas GPS, actualiza Redis/Postgres y difunde al grupo.
   * @param client Socket remitente.
   * @param data Coordenadas y metricas de hardware.
   */
  @SubscribeMessage('location_update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: IncomingLocationUpdateDto,
  ): Promise<void> {
    const user = client.data.user as SocketUserData | undefined;
    if (!user) return;

    if (
      typeof data.latitude !== 'number' ||
      typeof data.longitude !== 'number' ||
      isNaN(data.latitude) ||
      isNaN(data.longitude) ||
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      this.logger.warn(`Telemetría descartada por coordenadas inválidas de ${user.fullName}`);
      return;
    }

    const payload: RedisTelemetryPayload = {
      userId: user.sub,
      fullName: user.fullName,
      role: user.role,
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude ?? null,
      accuracy: data.accuracy ?? null,
      speed: data.speed ?? null,
      heading: data.heading ?? null,
      batteryLevel: data.batteryLevel ?? null,
      isSos: false,
      sosMessage: null,
      timestamp: data.timestamp || Date.now(),
    };

    // Procesar persistencia dual
    await this.telemetryService.processLocationUpdate(payload);

    // Difundir a todos los demas participantes
    client.broadcast.emit('user_location_broadcast', payload);
  }

  /**
   * Recibe una alerta critica SOS, la persiste inmediatamente en base de datos y la emite a todos los clientes.
   * @param client Socket remitente.
   * @param data Datos de la emergencia SOS.
   */
  @SubscribeMessage('sos_trigger')
  async handleSosTrigger(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: IncomingSosTriggerDto,
  ): Promise<void> {
    const user = client.data.user as SocketUserData | undefined;
    if (!user) return;

    if (
      typeof data.latitude !== 'number' ||
      typeof data.longitude !== 'number' ||
      isNaN(data.latitude) ||
      isNaN(data.longitude)
    ) {
      this.logger.warn(`Alerta SOS descartada por coordenadas inválidas de ${user.fullName}`);
      return;
    }

    const rawMessage = (data.message || '¡ALERTA SOS! Usuario solicita asistencia inmediata en ruta.').trim();
    // Sanitización y límite estricto de longitud (máximo 250 caracteres sin etiquetas HTML)
    const sanitizedMessage = rawMessage.slice(0, 250).replace(/[<>]/g, '');

    const payload: RedisTelemetryPayload = {
      userId: user.sub,
      fullName: user.fullName,
      role: user.role,
      latitude: data.latitude,
      longitude: data.longitude,
      batteryLevel: data.batteryLevel ?? null,
      isSos: true,
      sosMessage: sanitizedMessage,
      timestamp: data.timestamp || Date.now(),
    };

    this.logger.warn(`[EMERGENCIA SOS] Generada por ${user.fullName} en [${data.latitude}, ${data.longitude}]`);

    // Persistir forzosamente en Postgres (telemetry_logs) y Redis
    await this.telemetryService.processLocationUpdate(payload);

    // Persistir formalmente el incidente en sos_alerts para bitacora y atencion de guias/admin
    const alertRecord = await this.adminAlertsService.createAlertFromTrigger({
      userId: user.sub,
      fullName: user.fullName,
      latitude: data.latitude,
      longitude: data.longitude,
      batteryLevel: data.batteryLevel ?? null,
      message: sanitizedMessage,
      timestamp: data.timestamp || Date.now(),
    });

    // Emision con canal prioritario a toda la sala
    this.server.emit('sos_broadcast', {
      ...payload,
      id: alertRecord.id,
      message: sanitizedMessage,
    });
  }
}
