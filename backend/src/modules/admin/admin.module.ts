/**
 * @sdd
 * [Objetivo]: Módulo NestJS para la encapsulación de las funcionalidades administrativas del rol ADMIN (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Registra repositorios de User, RouteLogEntry, EventNote y Waypoint. Expone servicios y controladores administrativos.
 * [Edge Cases]: Aislamiento estricto de rutas privilegiadas bajo RBAC.
 */

// backend/src/modules/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { Waypoint } from '../routes/entities/waypoint.entity.js';
import { Route } from '../routes/entities/route.entity.js';
import { RouteLogEntry } from './entities/route-log-entry.entity.js';
import { EventNote } from './entities/event-note.entity.js';
import { SosAlert } from './entities/sos-alert.entity.js';
import { Guide } from '../guides/entities/guide.entity.js';
import { MedicalProfile } from '../medical/entities/medical-profile.entity.js';
import { AdminUsersService } from './services/admin-users.service.js';
import { AdminLogService } from './services/admin-log.service.js';
import { AdminNotesService } from './services/admin-notes.service.js';
import { AdminPoisService } from './services/admin-pois.service.js';
import { AdminAlertsService } from './services/admin-alerts.service.js';
import { AdminUsersController } from './controllers/admin-users.controller.js';
import { AdminRoutesUsersController } from './controllers/admin-routes-users.controller.js';
import { AdminLogController } from './controllers/admin-log.controller.js';
import { AdminNotesController } from './controllers/admin-notes.controller.js';
import { AdminPoisController } from './controllers/admin-pois.controller.js';
import { AdminAlertsController } from './controllers/admin-alerts.controller.js';

/**
 * Modulo administrativo para la gestion operativa de la plataforma.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RouteLogEntry,
      EventNote,
      Waypoint,
      Route,
      SosAlert,
      Guide,
      MedicalProfile,
    ]),
  ],
  controllers: [
    AdminUsersController,
    AdminRoutesUsersController,
    AdminLogController,
    AdminNotesController,
    AdminPoisController,
    AdminAlertsController,
  ],
  providers: [
    AdminUsersService,
    AdminLogService,
    AdminNotesService,
    AdminPoisService,
    AdminAlertsService,
  ],
  exports: [
    AdminUsersService,
    AdminLogService,
    AdminNotesService,
    AdminPoisService,
    AdminAlertsService,
  ],
})
export class AdminModule {}
