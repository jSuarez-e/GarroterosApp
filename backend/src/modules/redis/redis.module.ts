/**
 * @sdd
 * [Objetivo]: Modulo NestJS global para encapsular el acceso y persistencia en memoria Redis (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Exporta RedisService para inyeccion de dependencias en gateways y controladores.
 * [Edge Cases]: Modulo @Global para evitar re-instanciaciones o duplicacion de conexiones de socket a Redis.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service.js';

/**
 *
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
