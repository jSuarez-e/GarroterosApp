/**
 * @sdd
 * [Objetivo]: Servicio para la gestión de notas colaborativas de eventos e incidencias durante la ruta (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta Repository<EventNote>. Métodos getNotes, createNote, deleteNote.
 * [Edge Cases]: Auto-inicialización con notas de contexto si la tabla está vacía, ordenación cronológica descendente.
 */

// backend/src/modules/admin/services/admin-notes.service.ts

import { Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  EventNote,
  EventNoteSeverity,
} from '../entities/event-note.entity.js';
import { Route } from '../../routes/entities/route.entity.js';
import { CreateEventNoteDto } from '../dto/admin-note.dto.js';

/**
 * Servicio para la gestión de notas colaborativas de eventos e incidencias durante la ruta.
 */
@Injectable()
export class AdminNotesService implements OnModuleInit {
  /**
   * Inyecta los repositorios de notas y rutas.
   * @param noteRepository Repositorio de EventNote.
   * @param routeRepository Repositorio de Route.
   */
  constructor(
    @InjectRepository(EventNote)
    private readonly noteRepository: Repository<EventNote>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  /**
   * Inicializa notas iniciales de ejemplo si no existen registros.
   */
  async onModuleInit(): Promise<void> {
    const count = await this.noteRepository.count();
    if (count === 0) {
      const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
      const initialRouteId = activeRoute?.id ?? null;

      const initialNotes: Array<Partial<EventNote>> = [
        {
          routeId: initialRouteId,
          authorId: '00000000-0000-0000-0000-000000000001',
          authorName: 'Julio Guía Piedecuesta',
          title: 'Condición óptima del pavimento en Callejón de los Garroteros',
          content: 'Se realizó recorrido previo a las 07:00 AM. La vía colonial se encuentra limpia y seca, sin novedades de tráfico ni obras.',
          severity: EventNoteSeverity.INFO,
        },
        {
          routeId: initialRouteId,
          authorId: '00000000-0000-0000-0000-000000000002',
          authorName: 'Mayerly Guía Piedecuesta',
          title: 'Alerta por incremento de temperatura al mediodía',
          content: 'El pronóstico indica 26°C a las 12:30. Se recomienda insistir en paradas de sombra e hidratación continua en Ermita La Asunción.',
          severity: EventNoteSeverity.WARNING,
        },
      ];

      for (const n of initialNotes) {
        const entry = this.noteRepository.create(n);
        await this.noteRepository.save(entry);
      }
    } else {
      const activeRoute = await this.routeRepository.findOne({ where: { isActive: true } });
      if (activeRoute) {
        const unlinked = await this.noteRepository.find({ where: { routeId: IsNull() } });
        for (const entry of unlinked) {
          entry.routeId = activeRoute.id;
          await this.noteRepository.save(entry);
        }
      }
    }
  }

  /**
   * Obtiene la lista completa de notas colaborativas ordenadas desde la más reciente, opcionalmente filtradas por ruta.
   * Si no se especifica routeId, filtra por la ruta oficial activa del sistema.
   * @param routeId Identificador UUID opcional de la ruta para filtrar notas.
   * @returns Lista de notas de eventos.
   */
  async getNotes(routeId?: string): Promise<EventNote[]> {
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

    return this.noteRepository.find({
      where: { routeId: targetRouteId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Registra una nueva nota colaborativa firmada por el guía autenticado para una ruta.
   * @param authorId UUID del usuario autor.
   * @param authorName Nombre legible del autor.
   * @param dto Contenido, severidad y ruta de la nota.
   * @returns Nota creada.
   */
  async createNote(
    authorId: string,
    authorName: string,
    dto: CreateEventNoteDto,
  ): Promise<EventNote> {
    const note = this.noteRepository.create({
      routeId: dto.routeId ?? null,
      authorId,
      authorName,
      title: dto.title.trim(),
      content: dto.content.trim(),
      severity: dto.severity,
    });
    return this.noteRepository.save(note);
  }

  /**
   * Elimina una nota del sistema.
   * @param id UUID de la nota.
   * @returns Confirmación de éxito.
   */
  async deleteNote(id: string): Promise<{ /**
   * Confirmación de éxito.
   */
  success: boolean }> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Nota con ID ${id} no encontrada.`);
    }
    await this.noteRepository.remove(note);
    return { success: true };
  }
}
