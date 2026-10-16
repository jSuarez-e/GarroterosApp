/**
 * @sdd
 * [Objetivo]: Módulo NestJS para la encapsulación del dominio de fichas médicas y confirmación de asistencia (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Importa TypeOrmModule con MedicalProfile. Exporta MedicalService.
 * [Edge Cases]: Prevención de dependencias circulares mediante inyección de repositorios limpios.
 */

// backend/src/modules/medical/medical.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalProfile } from './entities/medical-profile.entity.js';
import { Route } from '../routes/entities/route.entity.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';
import { MedicalService } from './medical.service.js';
import { MedicalController } from './medical.controller.js';

/**
 *
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalProfile, Route]),
    TelemetryModule,
  ],
  controllers: [MedicalController],
  providers: [MedicalService],
  exports: [MedicalService],
})
export class MedicalModule {}
