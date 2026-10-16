/**
 * @sdd
 * [Objetivo]: Controlador REST para el directorio y administración de guías turísticos oficiales de Piedecuesta.
 * [I/O]: Expone GET /guides (con filtro de ruta y búsqueda), GET /guides/all, GET /guides/:id, POST /guides, PUT /guides/:id y DELETE /guides/:id.
 * [Edge Cases]: Protegido con JwtAuthGuard para lectura general, y RolesGuard(ADMIN) para operaciones de mutación.
 */

// backend/src/modules/guides/guides.controller.ts

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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';
import { GuidesService, type GuideProfileOutput } from './guides.service.js';
import { Guide } from './entities/guide.entity.js';
import { CreateGuideDto, UpdateGuideDto, GuideQueryDto } from './dto/guide.dto.js';

/**
 * Estructura de respuesta para la eliminación de un guía.
 */
export interface DeleteGuideResponseDto {
  /** Indica si la eliminación fue exitosa */
  success: boolean;
  /** Mensaje descriptivo del resultado */
  message: string;
}

/**
 * Controlador para la gestión y consulta del directorio oficial de guías turísticos.
 */
@ApiTags('Guides')
@ApiBearerAuth()
@Controller('guides')
@UseGuards(JwtAuthGuard)
export class GuidesController {
  /**
   * Inyección del servicio de guías.
   * @param guidesService Servicio de guías turísticos.
   */
  constructor(private readonly guidesService: GuidesService) {}

  /**
   * Obtiene la lista de guías turísticos asignados a la ruta oficial activa o filtrados por ruta / búsqueda.
   * @param query Filtros opcionales (search, routeId).
   * @returns Lista de perfiles de guías turísticos.
   */
  @Get()
  @ApiOperation({ summary: 'Obtener guías turísticos asignados al recorrido' })
  @ApiResponse({ status: 200, description: 'Lista de guías del recorrido retornada exitosamente' })
  async getGuides(@Query() query: GuideQueryDto): Promise<GuideProfileOutput[]> {
    return this.guidesService.getGuides(query.search, query.routeId);
  }

  /**
   * Obtiene todos los guías turísticos registrados en la tabla (para selección en panel admin).
   * @returns Directorio completo de guías.
   */
  @Get('all')
  @ApiOperation({ summary: 'Obtener el directorio completo de guías registrados' })
  @ApiResponse({ status: 200, description: 'Directorio completo retornado exitosamente' })
  async getAllGuides(): Promise<Guide[]> {
    return this.guidesService.getAllGuides();
  }

  /**
   * Obtiene el detalle de un guía por su identificador único.
   * @param id UUID del guía.
   * @returns Datos del guía.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener información detallada de un guía' })
  @ApiResponse({ status: 200, description: 'Guía encontrado' })
  @ApiResponse({ status: 404, description: 'Guía no encontrado' })
  async getGuideById(@Param('id') id: string): Promise<Guide> {
    return this.guidesService.getGuideById(id);
  }

  /**
   * Registra un nuevo guía en el catálogo (solo administradores).
   * @param dto Datos del nuevo guía.
   * @returns Guía creado.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo guía turístico (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Guía creado exitosamente' })
  async createGuide(@Body() dto: CreateGuideDto): Promise<Guide> {
    return this.guidesService.createGuide(dto);
  }

  /**
   * Actualiza los datos de un guía turístico (solo administradores).
   * @param id UUID del guía a editar.
   * @param dto Datos modificados.
   * @returns Guía actualizado.
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar datos de un guía turístico (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Guía actualizado exitosamente' })
  async updateGuide(
    @Param('id') id: string,
    @Body() dto: UpdateGuideDto,
  ): Promise<Guide> {
    return this.guidesService.updateGuide(id, dto);
  }

  /**
   * Elimina un guía del sistema (solo administradores).
   * @param id UUID del guía a eliminar.
   * @returns Confirmación de eliminación.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar un guía turístico (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Guía eliminado exitosamente' })
  async deleteGuide(@Param('id') id: string): Promise<DeleteGuideResponseDto> {
    await this.guidesService.deleteGuide(id);
    return { success: true, message: 'Guía eliminado exitosamente' };
  }
}
