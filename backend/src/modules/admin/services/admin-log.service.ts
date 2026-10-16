/**
 * @sdd
 * [Objetivo]: Servicio para la gestión de la bitácora e itinerario cronológico de la ruta turística (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta Repository<RouteLogEntry>. Métodos getLogEntries, createEntry, updateEntry, deleteEntry.
 * [Edge Cases]: Auto-inicialización con hitos estándar si la tabla está vacía, ordenación por orderIndex ascendente.
 */

// backend/src/modules/admin/services/admin-log.service.ts

import { Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  RouteLogEntry,
  ItineraryStatus,
} from '../entities/route-log-entry.entity.js';
import { Route } from '../../routes/entities/route.entity.js';
import {
  CreateRouteLogEntryDto,
  UpdateRouteLogEntryDto,
} from '../dto/admin-log.dto.js';

/**
 * Servicio administrativo para la gestión de bitácora e itinerario.
 */
@Injectable()
export class AdminLogService implements OnModuleInit {
  /**
   * Inicializa el servicio inyectando repositorios de itinerario y rutas.
   * @param logRepository Repositorio de RouteLogEntry.
   * @param routeRepository Repositorio de Route.
   */
  constructor(
    @InjectRepository(RouteLogEntry)
    private readonly logRepository: Repository<RouteLogEntry>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  /**
   * Inicializa hitos estándar del recorrido de los Garroteros si no existen registros.
   */
  async onModuleInit(): Promise<void> {
    const count = await this.logRepository.count();
    if (count === 0) {
      const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
      const initialRouteId = activeRoute?.id ?? null;

      const initialMilestones: Array<Partial<RouteLogEntry>> = [
        {
          routeId: initialRouteId,
          title: 'Recepción y registro de turistas en Parque La Libertad',
          orderIndex: 1,
          plannedTime: '08:00',
          actualTime: '08:05',
          status: ItineraryStatus.COMPLETED,
          notes: 'Verificación de asistencia y entrega de distintivos.',
        },
        {
          routeId: initialRouteId,
          title: 'Charla histórica inicial y visita a Iglesia San Francisco Javier',
          orderIndex: 2,
          plannedTime: '08:45',
          actualTime: '08:50',
          status: ItineraryStatus.IN_PROGRESS,
          notes: 'Grupo completo prestando atención a la reseña patrimonial.',
        },
        {
          routeId: initialRouteId,
          title: 'Tránsito por el Callejón de los Garroteros',
          orderIndex: 3,
          plannedTime: '09:30',
          status: ItineraryStatus.PENDING,
          notes: 'Tramo peatonal empedrado con relatos comuneros.',
        },
        {
          routeId: initialRouteId,
          title: 'Punto de hidratación y parada en Ermita La Asunción',
          orderIndex: 4,
          plannedTime: '10:15',
          status: ItineraryStatus.PENDING,
          notes: 'Revisión de estado físico de excursionistas.',
        },
        {
          routeId: initialRouteId,
          title: 'Clausura cultural y muestra en Casa de la Cultura García Rovira',
          orderIndex: 5,
          plannedTime: '11:00',
          status: ItineraryStatus.PENDING,
          notes: 'Degustación tradicional y cierre oficial.',
        },
      ];

      for (const m of initialMilestones) {
        const entry = this.logRepository.create(m);
        await this.logRepository.save(entry);
      }
    } else {
      const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
      if (activeRoute) {
        const unlinked = await this.logRepository.find({ where: { routeId: IsNull() } });
        for (const entry of unlinked) {
          entry.routeId = activeRoute.id;
          await this.logRepository.save(entry);
        }
      }
    }
  }

  /**
   * Obtiene todos los hitos del itinerario ordenados cronológicamente por su índice, opcionalmente filtrados por ruta.
   * Si no se especifica routeId, filtra por la ruta oficial activa del sistema.
   * @param routeId Identificador UUID opcional de la ruta para filtrar el itinerario.
   * @returns Lista de entradas del itinerario.
   */
  async getLogEntries(routeId?: string): Promise<RouteLogEntry[]> {
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

    return this.logRepository.find({
      where: { routeId: targetRouteId },
      order: { orderIndex: 'ASC' },
    });
  }

  /**
   * Registra un nuevo hito u observación temporal en la bitácora de ruta.
   * @param dto Datos del hito a crear.
   * @returns Hito persistido.
   */
  async createEntry(dto: CreateRouteLogEntryDto): Promise<RouteLogEntry> {
    const entry = this.logRepository.create({
      routeId: dto.routeId ?? null,
      title: dto.title.trim(),
      orderIndex: dto.orderIndex,
      plannedTime: dto.plannedTime.trim(),
      waypointId: dto.waypointId ?? null,
      notes: dto.notes ?? null,
      status: ItineraryStatus.PENDING,
    });
    return this.logRepository.save(entry);
  }

  /**
   * Actualiza el estado operativo, hora real o anotaciones de un hito.
   * @param id UUID del hito.
   * @param dto Cambios a aplicar.
   * @returns Hito actualizado.
   */
  async updateEntry(id: string, dto: UpdateRouteLogEntryDto): Promise<RouteLogEntry> {
    const entry = await this.logRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Hito de itinerario con ID ${id} no encontrado.`);
    }

    if (dto.routeId !== undefined) entry.routeId = dto.routeId ?? null;
    if (dto.title !== undefined) entry.title = dto.title.trim();
    if (dto.orderIndex !== undefined) entry.orderIndex = dto.orderIndex;
    if (dto.plannedTime !== undefined) entry.plannedTime = dto.plannedTime.trim();
    if (dto.actualTime !== undefined) entry.actualTime = dto.actualTime ?? null;
    if (dto.status !== undefined) entry.status = dto.status;
    if (dto.notes !== undefined) entry.notes = dto.notes ?? null;

    return this.logRepository.save(entry);
  }

  /**
   * Elimina un hito del itinerario.
   * @param id UUID del hito a eliminar.
   * @returns Confirmación de éxito.
   */
  async deleteEntry(id: string): Promise<{ /**
   *
   */
  success: boolean }> {
    const entry = await this.logRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Hito de itinerario con ID ${id} no encontrado.`);
    }
    await this.logRepository.remove(entry);
    return { success: true };
  }
}
