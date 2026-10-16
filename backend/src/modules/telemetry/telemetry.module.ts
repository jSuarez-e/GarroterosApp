/**
 * @sdd
 * [Objetivo]: Modulo NestJS de telemetria en tiempo real, persistencia dual y WebSocket Gateway (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Registra TypeOrmModule.forFeature([TelemetryLog]), RedisModule, TelemetryService, TelemetryGateway y TelemetryController.
 * [Edge Cases]: Prevencion de dependencias circulares mediante inyeccion de AuthModule para JwtService.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TelemetryLog } from './entities/telemetry-log.entity.js';
import { Route } from '../routes/entities/route.entity.js';
import { Waypoint } from '../routes/entities/waypoint.entity.js';
import { TelemetryService } from './telemetry.service.js';
import { TelemetryGateway } from './gateways/telemetry.gateway.js';
import { TelemetryController } from './telemetry.controller.js';
import { RedisModule } from '../redis/redis.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminModule } from '../admin/admin.module.js';

/**
 * Módulo para la telemetría en tiempo real y cálculo dinámico de rutas hacia el punto de encuentro oficial.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelemetryLog, Route, Waypoint]),
    ConfigModule,
    RedisModule,
    AuthModule,
    AdminModule,
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryGateway],
  exports: [TelemetryService, TelemetryGateway],
})
export class TelemetryModule {}
