/**
 * @sdd
 * [Objetivo]: Controlador REST para la gestión de la bitácora e itinerario cronológico de la ruta (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Expone GET, POST, PUT, DELETE bajo /admin/log. Interactúa con AdminLogService.
 * [Edge Cases]: Protegido con JwtAuthGuard y RolesGuard(ADMIN). Validación de tiempos planeados y reales.
 */

// backend/src/modules/admin/controllers/admin-log.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { UserRole } from '../../users/entities/user.entity.js';
import { AdminLogService } from '../services/admin-log.service.js';
import {
  CreateRouteLogEntryDto,
  UpdateRouteLogEntryDto,
} from '../dto/admin-log.dto.js';
import { RouteLogEntry } from '../entities/route-log-entry.entity.js';

/**
 * Controlador administrativo para la bitácora e itinerario de la ruta.
 */
@Controller('admin/log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminLogController {
  /**
   * Inyecta el servicio de bitácora e itinerario.
   * @param adminLogService Servicio administrativo de itinerario.
   */
  constructor(private readonly adminLogService: AdminLogService) {}

  /**
   * Obtiene los hitos del itinerario, opcionalmente filtrados por ruta.
   * @param routeId Identificador opcional de la ruta.
   * @returns Lista de hitos de itinerario.
   */
  @Get()
  async getEntries(@Query('routeId') routeId?: string): Promise<RouteLogEntry[]> {
    return this.adminLogService.getLogEntries(routeId);
  }

  /**
   * Crea un nuevo hito en el itinerario de una ruta.
   * @param dto Datos del hito a crear.
   * @returns Hito registrado.
   */
  @Post()
  async createEntry(@Body() dto: CreateRouteLogEntryDto): Promise<RouteLogEntry> {
    return this.adminLogService.createEntry(dto);
  }

  /**
   * Actualiza los datos o estado de un hito existente.
   * @param id UUID del hito.
   * @param dto Modificaciones a aplicar.
   * @returns Hito actualizado.
   */
  @Put(':id')
  async updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdateRouteLogEntryDto,
  ): Promise<RouteLogEntry> {
    return this.adminLogService.updateEntry(id, dto);
  }

  /**
   * Elimina un hito del itinerario.
   * @param id UUID del hito a eliminar.
   * @returns Confirmación de eliminación.
   */
  @Delete(':id')
  async deleteEntry(@Param('id') id: string): Promise<{ /**
   * Confirmación de éxito.
   */
  success: boolean }> {
    return this.adminLogService.deleteEntry(id);
  }
}
