/**
 * @sdd
 * [Objetivo]: Controlador REST para la cartografía, waypoints, meteorología y administración de rutas y asignación de guías.
 * [I/O]: Expone endpoints de lectura para todos los usuarios y mutaciones protegidas con RolesGuard(ADMIN).
 * [Edge Cases]: Orden estricto de rutas específicas (/waypoints, /path, /weather) antes de rutas parametrizadas (/:id).
 */

// backend/src/modules/routes/routes.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';
import { RoutesService } from './routes.service.js';
import { Route } from './entities/route.entity.js';
import { RouteLogEntry } from '../admin/entities/route-log-entry.entity.js';
import { CreateRouteDto, UpdateRouteDto } from './dto/create-route.dto.js';
import type {
  PoiDto,
  RoutePathDto,
  WeatherReportDto,
} from './dto/route.dto.js';

/**
 * Respuesta para eliminación de una ruta.
 */
export interface DeleteRouteResponseDto {
  /** Indica si la eliminación fue exitosa */
  success: boolean;
  /** Mensaje informativo */
  message: string;
}

/**
 * Controlador que centraliza la cartografia, waypoints, meteorologia y administracion de senderos turisticos.
 */
@ApiTags('Routes')
@ApiBearerAuth()
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  /**
   * Inyección del servicio de rutas.
   * @param routesService Servicio de cartografía y rutas.
   */
  constructor(private readonly routesService: RoutesService) {}

  /**
   * Obtiene la lista completa de Puntos de Interes ordenados por su posicion en el itinerario, opcionalmente filtrados por ruta.
   * @param routeId Identificador opcional de la ruta para filtrar waypoints.
   * @returns Lista de POIs con texto descriptivo, URLs de audio y fotografias.
   */
  @Get('waypoints')
  @ApiOperation({ summary: 'Obtener waypoints y puntos de interés del sendero' })
  @ApiResponse({ status: 200, description: 'Lista de waypoints obtenida exitosamente' })
  async getWaypoints(@Query('routeId') routeId?: string): Promise<PoiDto[]> {
    return this.routesService.getWaypoints(routeId);
  }

  /**
   * Obtiene la polilinea oficial del recorrido en formato GeoJSON coordinates.
   * @returns Estructura con metadatos del sendero y arreglo de coordenadas [lng, lat].
   */
  @Get('path')
  @ApiOperation({ summary: 'Obtener trazado y polilínea oficial del sendero activo' })
  @ApiResponse({ status: 200, description: 'Trazado obtenido exitosamente' })
  async getRoutePath(): Promise<RoutePathDto> {
    return this.routesService.getRoutePath();
  }

  /**
   * Consulta el estado del clima en tiempo real y pronostico para Piedecuesta.
   * @returns Reporte meteorologico estructurado con recomendaciones de hidratacion y seguridad.
   */
  @Get('weather')
  @ApiOperation({ summary: 'Consultar estado meteorológico en tiempo real' })
  @ApiResponse({ status: 200, description: 'Reporte del clima retornado exitosamente' })
  async getWeather(): Promise<WeatherReportDto> {
    return this.routesService.getWeather();
  }

  /**
   * Obtiene la secuencia cronológica de hitos del itinerario para la ruta activa (o una ruta específica).
   * @param routeId Identificador UUID opcional de la ruta.
   * @returns Lista de hitos de la bitácora e itinerario.
   */
  @Get('itinerary')
  @ApiOperation({ summary: 'Obtener itinerario y cronograma de hitos del recorrido' })
  @ApiResponse({ status: 200, description: 'Lista de hitos del itinerario obtenida exitosamente' })
  async getItinerary(@Query('routeId') routeId?: string): Promise<RouteLogEntry[]> {
    return this.routesService.getItinerary(routeId);
  }

  /**
   * Obtiene el listado completo de rutas turísticas registradas con sus guías oficiales asociados.
   * @returns Lista de rutas.
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas las rutas turísticas con sus guías asignados' })
  @ApiResponse({ status: 200, description: 'Colección de rutas' })
  async getAllRoutes(): Promise<Route[]> {
    return this.routesService.getAllRoutes();
  }

  /**
   * Obtiene el detalle de una ruta específica por su identificador UUID.
   * @param id Identificador UUID de la ruta.
   * @returns Entidad de la ruta encontrada con sus guías.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una ruta por ID' })
  @ApiResponse({ status: 200, description: 'Ruta encontrada' })
  @ApiResponse({ status: 404, description: 'Ruta no encontrada' })
  async getRouteById(@Param('id') id: string): Promise<Route> {
    return this.routesService.getRouteById(id);
  }

  /**
   * Crea una nueva ruta turística y le asigna los guías oficiales seleccionados (solo administradores).
   * @param dto Datos de la ruta y arreglo de IDs de guías.
   * @returns Ruta recién creada.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva ruta turística con guías asignados (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Ruta creada exitosamente' })
  async createRoute(@Body() dto: CreateRouteDto): Promise<Route> {
    return this.routesService.createRoute(dto);
  }

  /**
   * Actualiza los datos de una ruta existente y su selección de guías (solo administradores).
   * @param id UUID de la ruta a modificar.
   * @param dto Campos de actualización.
   * @returns Ruta modificada.
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar una ruta turística y sus guías asignados (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Ruta actualizada exitosamente' })
  async updateRoute(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
  ): Promise<Route> {
    return this.routesService.updateRoute(id, dto);
  }

  /**
   * Elimina una ruta turística del sistema (solo administradores).
   * @param id UUID de la ruta a eliminar.
   * @returns Confirmación de eliminación.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar una ruta turística (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Ruta eliminada exitosamente' })
  async deleteRoute(@Param('id') id: string): Promise<DeleteRouteResponseDto> {
    await this.routesService.deleteRoute(id);
    return { success: true, message: 'Ruta eliminada exitosamente' };
  }

  /**
   * Establece una ruta como el recorrido oficial activo de la aplicación (solo administradores).
   * @param id UUID de la ruta a activar.
   * @returns Ruta activada.
   */
  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activar una ruta como el recorrido oficial del sistema (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Ruta activada exitosamente' })
  async activateRoute(@Param('id') id: string): Promise<Route> {
    return this.routesService.setActiveRoute(id);
  }
}
