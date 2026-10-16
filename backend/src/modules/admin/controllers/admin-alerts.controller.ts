/**
 * @sdd
 * [Objetivo]: Controlador REST para la administracion y resolucion de alertas SOS por guias y administradores (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Expone GET /admin/alerts y PATCH /admin/alerts/:id/status. Protegido por JwtAuthGuard y RolesGuard(ADMIN).
 * [Edge Cases]: Validacion con DTO y decorador @CurrentUser para trazabilidad.
 */

// backend/src/modules/admin/controllers/admin-alerts.controller.ts

import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { User, UserRole } from '../../users/entities/user.entity.js';
import { AdminAlertsService, type SosAlertResponseItem } from '../services/admin-alerts.service.js';
import { UpdateSosAlertDto } from '../dto/update-sos-alert.dto.js';
import { SosAlertStatus } from '../entities/sos-alert.entity.js';

/**
 * Controlador administrativo para la inspeccion y cierre de alertas de emergencia.
 */
@ApiTags('Admin - Alertas SOS')
@ApiBearerAuth()
@Controller('admin/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAlertsController {
  /**
   * Constructor con inyeccion del servicio de alertas.
   * @param adminAlertsService Servicio administrativo de alertas.
   */
  constructor(private readonly adminAlertsService: AdminAlertsService) {}

  /**
   * Obtiene la lista de alertas SOS registradas con filtro opcional de estado.
   * @param status Filtro opcional por estado.
   * @returns Lista de alertas en formato compatible con frontend.
   */
  @ApiOperation({ summary: 'Obtener historial de alertas SOS con filtro de estado' })
  @ApiResponse({ status: 200, description: 'Lista de alertas SOS' })
  @Get()
  async getAlerts(
    @Query('status') status?: SosAlertStatus,
  ): Promise<SosAlertResponseItem[]> {
    return this.adminAlertsService.getAlerts(status);
  }

  /**
   * Marca o cancela una alerta SOS registrando obligatoriamente la nota del suceso.
   * @param id Identificador UUID de la alerta.
   * @param admin Usuario guia o admin autenticado que gestiona la alerta.
   * @param dto Datos de actualizacion con el nuevo estado y la nota de resolucion.
   * @returns Alerta actualizada.
   */
  @ApiOperation({ summary: 'Marcar o cancelar una alerta SOS registrando nota de suceso' })
  @ApiResponse({ status: 200, description: 'Alerta actualizada' })
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() admin: User,
    @Body() dto: UpdateSosAlertDto,
  ): Promise<SosAlertResponseItem> {
    return this.adminAlertsService.updateAlertStatus(id, admin, dto);
  }
}
