/**
 * @sdd
 * [Objetivo]: Modulo NestJS para gestion de rutas, POIs y clima en vivo (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Registra Waypoint en TypeOrmModule.forFeature, provee RoutesService y expone RoutesController.
 * [Edge Cases]: Ninguno. Exporta RoutesService para reutilizacion cross-module.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waypoint } from './entities/waypoint.entity.js';
import { Route } from './entities/route.entity.js';
import { Guide } from '../guides/entities/guide.entity.js';
import { RouteLogEntry } from '../admin/entities/route-log-entry.entity.js';
import { RoutesService } from './routes.service.js';
import { RoutesController } from './routes.controller.js';

/**
 * Módulo para la gestión integral de rutas, puntos de interés (POIs), senderos y asignación de guías.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Waypoint, Route, Guide, RouteLogEntry])],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
