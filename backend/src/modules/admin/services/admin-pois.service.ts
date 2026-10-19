/**
 * @sdd
 * [Objetivo]: Servicio de administración para la creación, edición y georreferenciación de Puntos de Interés / POIs (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta Repository<Waypoint>. Métodos getPois, getPoiById, createPoi, updatePoi, deletePoi.
 * [Edge Cases]: Transformación espacial de PostGIS Point (longitud, latitud) en números legibles por el cliente.
 */

// backend/src/modules/admin/services/admin-pois.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Waypoint } from '../../routes/entities/waypoint.entity.js';
import { Route } from '../../routes/entities/route.entity.js';
import {
  AdminCreatePoiDto,
  AdminUpdatePoiDto,
} from '../dto/admin-poi.dto.js';

/**
 *
 */
export interface AdminPoiOutput {
  /**
   *
   */
  id: string;
  /**
   * Identificador UUID de la ruta a la que pertenece el POI.
   */
  routeId: string | null;
  /**
   * Nombre oficial de la ruta turística vinculada.
   */
  routeName?: string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  description: string;
  /**
   *
   */
  orderIndex: number;
  /**
   *
   */
  latitude: number;
  /**
   *
   */
  longitude: number;
  /**
   *
   */
  audioUrl: string | null;
  /**
   *
   */
  photoUrls: string[];
}

/**
 *
 */
@Injectable()
export class AdminPoisService {
  /**
   * Inicializa el servicio inyectando repositorios de Waypoints y Rutas.
   * @param waypointRepository Repositorio TypeORM para operaciones con waypoints.
   * @param routeRepository Repositorio TypeORM para operaciones con rutas.
   */
  constructor(
    @InjectRepository(Waypoint)
    private readonly waypointRepository: Repository<Waypoint>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  /**
   * Obtiene la lista completa de POIs ordenados por su índice secuencial, opcionalmente filtrados por ruta.
   * Si no se especifica routeId, filtra por la ruta oficial activa del sistema.
   * @param routeId Identificador opcional de la ruta para filtrar.
   * @returns Lista de POIs con coordenadas y URLs multimedia.
   */
  async getPois(routeId?: string): Promise<AdminPoiOutput[]> {
    let targetRouteId = routeId;
    if (!targetRouteId) {
      const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
      if (activeRoute) {
        targetRouteId = activeRoute.id;
      }
    }

    if (!targetRouteId) {
      return [];
    }

    const list = await this.waypointRepository.find({
      where: { routeId: targetRouteId },
      relations: { route: true },
      order: { orderIndex: 'ASC' },
    });
    return list.map((wp) => this.mapWaypoint(wp));
  }

  /**
   * Obtiene un POI por su identificador único.
   * @param id UUID del waypoint.
   * @returns Datos del POI.
   * @throws NotFoundException si no existe.
   */
  async getPoiById(id: string): Promise<AdminPoiOutput> {
    const wp = await this.waypointRepository.findOne({
      where: { id },
      relations: { route: true },
    });
    if (!wp) {
      throw new NotFoundException(`Punto de interés con ID ${id} no encontrado.`);
    }
    return this.mapWaypoint(wp);
  }

  /**
   * Normaliza enlaces de Google Drive para streaming multimedia directo en HTMLAudioElement.
   * @param url URL de audio original.
   * @returns URL compatible con streaming binario.
   */
  public normalizeGoogleDriveUrl(url?: string | null): string | null {
    if (!url) return null;
    const cleaned = url.trim();
    const driveMatch = cleaned.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleaned.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    return cleaned;
  }

  /**
   * Crea un nuevo Punto de Interés georreferenciado en el sistema asignado a una ruta.
   * @param dto Datos del POI incluyendo latitud, longitud y routeId.
   * @returns POI persistido.
   */
  async createPoi(dto: AdminCreatePoiDto): Promise<AdminPoiOutput> {
    const wp = this.waypointRepository.create({
      routeId: dto.routeId ?? null,
      title: dto.title.trim(),
      description: dto.description.trim(),
      orderIndex: dto.orderIndex,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
      audioUrl: this.normalizeGoogleDriveUrl(dto.audioUrl),
      photoUrls: dto.photoUrls ?? [],
    });

    const saved = await this.waypointRepository.save(wp);
    return this.getPoiById(saved.id);
  }

  /**
   * Actualiza los datos o coordenadas de un Punto de Interés existente.
   * @param id UUID del waypoint.
   * @param dto Cambios a aplicar.
   * @returns POI actualizado.
   */
  async updatePoi(id: string, dto: AdminUpdatePoiDto): Promise<AdminPoiOutput> {
    const wp = await this.waypointRepository.findOne({ where: { id } });
    if (!wp) {
      throw new NotFoundException(`Punto de interés con ID ${id} no encontrado.`);
    }

    if (dto.routeId !== undefined) wp.routeId = dto.routeId ?? null;
    if (dto.title !== undefined) wp.title = dto.title.trim();
    if (dto.description !== undefined) wp.description = dto.description.trim();
    if (dto.orderIndex !== undefined) wp.orderIndex = dto.orderIndex;
    if (dto.audioUrl !== undefined) wp.audioUrl = this.normalizeGoogleDriveUrl(dto.audioUrl);
    if (dto.photoUrls !== undefined) wp.photoUrls = dto.photoUrls ?? [];

    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const currentLng = wp.location.coordinates[0];
      const currentLat = wp.location.coordinates[1];
      wp.location = {
        type: 'Point',
        coordinates: [
          dto.longitude !== undefined ? dto.longitude : currentLng,
          dto.latitude !== undefined ? dto.latitude : currentLat,
        ],
      };
    }

    await this.waypointRepository.save(wp);
    return this.getPoiById(wp.id);
  }

  /**
   * Elimina un Punto de Interés del catálogo.
   * @param id UUID del waypoint.
   * @returns Confirmación de éxito.
   */
  async deletePoi(id: string): Promise<{ /**
   *
   */
  success: boolean }> {
    const wp = await this.waypointRepository.findOne({ where: { id } });
    if (!wp) {
      throw new NotFoundException(`Punto de interés con ID ${id} no encontrado.`);
    }
    await this.waypointRepository.remove(wp);
    return { success: true };
  }

  /**
   * Mapea la entidad interna PostGIS a la estructura JSON pública para clientes.
   * @param wp Entidad Waypoint a mapear.
   * @returns Estructura pública tipada AdminPoiOutput.
   */
  private mapWaypoint(wp: Waypoint): AdminPoiOutput {
    return {
      id: wp.id,
      routeId: wp.routeId,
      routeName: wp.route?.name,
      title: wp.title,
      description: wp.description,
      orderIndex: wp.orderIndex,
      latitude: wp.location.coordinates[1],
      longitude: wp.location.coordinates[0],
      audioUrl: wp.audioUrl,
      photoUrls: wp.photoUrls || [],
    };
  }
}
