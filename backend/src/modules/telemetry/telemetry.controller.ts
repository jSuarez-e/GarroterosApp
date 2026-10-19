/**
 * @sdd
 * [Objetivo]: Controlador REST para calculo de ruta al punto de encuentro y consulta de telemetria en vivo (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: GET /api/v1/telemetry/how-to-arrive (lat, lng), GET /api/v1/telemetry/live.
 * [Edge Cases]: Validacion de coordenadas flotantes, calculo seguro y proteccion de snapshot con JWT.
 */

import { Controller, Get, Post, Body, Query, ParseFloatPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service.js';
import type { RouteNavigationResult } from './telemetry.service.js';
import type { RedisTelemetryPayload } from '../redis/redis.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { AdminAlertsService } from '../admin/services/admin-alerts.service.js';
import type { SosAlertResponseItem } from '../admin/services/admin-alerts.service.js';
import { TelemetryGateway } from './gateways/telemetry.gateway.js';
import { CreateSosTriggerDto } from './dto/create-sos-trigger.dto.js';

/**
 * Controlador de endpoints de telemetría y georreferenciación.
 */
@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
  /**
   * Inicializa el controlador con los servicios de telemetría, alertas administrativas y gateway en tiempo real.
   * @param telemetryService Servicio de telemetría.
   * @param adminAlertsService Servicio para la persistencia formal de incidentes SOS.
   * @param telemetryGateway Gateway WebSocket para la difusion inmediata de eventos de emergencia.
   */
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly adminAlertsService: AdminAlertsService,
    private readonly telemetryGateway: TelemetryGateway,
  ) {}

  /**
   * Calcula la distancia, tiempo de caminata, tiempo en carro y enlaces de navegacion hacia el punto de encuentro oficial o punto de inicio de ruta.
   * @param lat Latitud del usuario.
   * @param lng Longitud del usuario.
   * @param routeId Identificador opcional de la ruta para obtener su punto de inicio establecido.
   * @returns Datos de navegacion al punto de encuentro.
   */
  @Get('how-to-arrive')
  @ApiOperation({
    summary: 'Calcular ruta al punto de encuentro oficial',
    description: 'Aplica formula de Haversine hacia el Parque Principal La Libertad en Piedecuesta y provee enlaces a Google Maps y Waze.',
  })
  @ApiQuery({ name: 'lat', type: Number, description: 'Latitud actual' })
  @ApiQuery({ name: 'lng', type: Number, description: 'Longitud actual' })
  @ApiQuery({ name: 'routeId', type: String, required: false, description: 'ID de la ruta (opcional)' })
  @ApiResponse({ status: 200, description: 'Cálculo de ruta generado exitosamente.' })
  async getHowToArrive(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('routeId') routeId?: string,
  ): Promise<RouteNavigationResult> {
    return this.telemetryService.calculateHowToArrive(lat, lng, routeId);
  }

  /**
   * Obtiene la fotografia instantanea de todas las posiciones activas en Redis sin golpear PostgreSQL.
   * @returns Lista de usuarios y coordenadas activas.
   */
  @Get('live')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar snapshot de telemetria activa desde Redis' })
  @ApiResponse({ status: 200, description: 'Snapshot recuperado exitosamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado / Token ausente o invalido.' })
  async getLiveSnapshot(): Promise<RedisTelemetryPayload[]> {
    return this.telemetryService.getLiveSnapshot();
  }

  /**
   * Emite una alerta de emergencia SOS via REST, la persiste en base de datos y la difunde en tiempo real a administradores y guias.
   * @param user Usuario autenticado emisor de la emergencia.
   * @param dto Coordenadas, altitud, bateria y mensaje opcional.
   * @returns Incidente SOS registrado y persistido.
   */
  @Post('sos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Emitir alerta de emergencia SOS y persistir incidente en base de datos',
    description: 'Registra el incidente en Postgres (sos_alerts y telemetry_logs), actualiza Redis y difunde via WebSocket a guias/admin.',
  })
  @ApiResponse({ status: 201, description: 'Alerta SOS registrada y persistida exitosamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado / Token ausente o invalido.' })
  async triggerSos(
    @CurrentUser() user: User,
    @Body() dto: CreateSosTriggerDto,
  ): Promise<SosAlertResponseItem> {
    const rawMessage = (dto.message || '¡ALERTA SOS! Usuario solicita asistencia inmediata en ruta.').trim();
    const sanitizedMessage = rawMessage.slice(0, 250).replace(/[<>]/g, '');

    const payload: RedisTelemetryPayload = {
      userId: user.id,
      fullName: user.fullName,
      role: user.role,
      latitude: dto.latitude,
      longitude: dto.longitude,
      altitude: dto.altitude ?? null,
      accuracy: null,
      speed: null,
      heading: null,
      batteryLevel: dto.batteryLevel ?? null,
      isSos: true,
      sosMessage: sanitizedMessage,
      timestamp: dto.timestamp || Date.now(),
    };

    // 1. Guardar en Postgres (telemetry_logs) y en Redis
    await this.telemetryService.processLocationUpdate(payload);

    // 2. Persistir formalmente en la tabla sos_alerts para atencion y bitacora administrativa
    const alertRecord = await this.adminAlertsService.createAlertFromTrigger({
      userId: user.id,
      fullName: user.fullName,
      latitude: dto.latitude,
      longitude: dto.longitude,
      altitude: dto.altitude ?? null,
      batteryLevel: dto.batteryLevel ?? null,
      message: sanitizedMessage,
      timestamp: dto.timestamp || Date.now(),
    });

    const mappedEntry = this.adminAlertsService.mapToEntry(alertRecord);

    // 3. Emitir via WebSocket enriqueciendo la alerta con los guías asignados a la ruta activa
    await this.telemetryGateway.broadcastSosAlert(payload, alertRecord.id, sanitizedMessage);

    return mappedEntry;
  }
}

