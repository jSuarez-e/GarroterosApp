/**
 * @sdd
 * [Objetivo]: Módulo NestJS para la encapsulación del directorio de guías turísticos oficiales (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Importa TypeOrmModule con User. Exporta GuidesService.
 * [Edge Cases]: Reutiliza la entidad User para evitar duplicación de identidades en la base de datos.
 */

// backend/src/modules/guides/guides.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guide } from './entities/guide.entity.js';
import { Route } from '../routes/entities/route.entity.js';
import { GuidesService } from './guides.service.js';
import { GuidesController } from './guides.controller.js';

/**
 * Módulo para la gestión del directorio oficial de guías turísticos y su vinculación con rutas.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Guide, Route])],
  controllers: [GuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}
