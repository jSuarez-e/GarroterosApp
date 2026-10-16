/**
 * @sdd
 * [Objetivo]: Controlador REST para la administración y georreferenciación de Puntos de Interés / POIs (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Expone GET, POST, PUT, DELETE bajo /admin/pois. Retorna y modifica waypoints del mapa.
 * [Edge Cases]: Protegido con JwtAuthGuard y RolesGuard(ADMIN). Validación de latitud y longitud.
 */

// backend/src/modules/admin/controllers/admin-pois.controller.ts

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
import { AdminPoisService, AdminPoiOutput } from '../services/admin-pois.service.js';
import {
  AdminCreatePoiDto,
  AdminUpdatePoiDto,
} from '../dto/admin-poi.dto.js';

/**
 *
 */
@Controller('admin/pois')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPoisController {
  /**
   * Inyecta el servicio de administración de POIs.
   * @param adminPoisService Servicio de administración de POIs.
   */
  constructor(private readonly adminPoisService: AdminPoisService) {}

  /**
   * Obtiene la lista completa de POIs, opcionalmente filtrada por ruta.
   * @param routeId Identificador opcional de la ruta.
   * @returns Lista de POIs.
   */
  @Get()
  async getPois(@Query('routeId') routeId?: string): Promise<AdminPoiOutput[]> {
    return this.adminPoisService.getPois(routeId);
  }

  /**
   * Obtiene un POI específico por su identificador.
   * @param id UUID del POI.
   * @returns Datos del POI.
   */
  @Get(':id')
  async getPoiById(@Param('id') id: string): Promise<AdminPoiOutput> {
    return this.adminPoisService.getPoiById(id);
  }

  /**
   * Registra y georreferencia un nuevo POI en una ruta.
   * @param dto Datos del nuevo POI.
   * @returns POI creado.
   */
  @Post()
  async createPoi(@Body() dto: AdminCreatePoiDto): Promise<AdminPoiOutput> {
    return this.adminPoisService.createPoi(dto);
  }

  /**
   * Modifica los datos o coordenadas de un POI existente.
   * @param id UUID del POI.
   * @param dto Cambios a aplicar.
   * @returns POI modificado.
   */
  @Put(':id')
  async updatePoi(
    @Param('id') id: string,
    @Body() dto: AdminUpdatePoiDto,
  ): Promise<AdminPoiOutput> {
    return this.adminPoisService.updatePoi(id, dto);
  }

  /**
   * Elimina un POI de la ruta.
   * @param id UUID del POI a eliminar.
   * @returns Confirmación de éxito.
   */
  @Delete(':id')
  async deletePoi(@Param('id') id: string): Promise<{ /**
   * Confirmación de éxito.
   */
  success: boolean }> {
    return this.adminPoisService.deletePoi(id);
  }
}
