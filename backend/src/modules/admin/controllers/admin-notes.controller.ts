/**
 * @sdd
 * [Objetivo]: Controlador REST para la bitácora colaborativa de notas de eventos durante el recorrido (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Expone GET, POST y DELETE bajo /admin/notes. Asigna autoría automáticamente con @CurrentUser().
 * [Edge Cases]: Protegido con JwtAuthGuard y RolesGuard(ADMIN). Clasificación por severidad.
 */

// backend/src/modules/admin/controllers/admin-notes.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { User, UserRole } from '../../users/entities/user.entity.js';
import { AdminNotesService } from '../services/admin-notes.service.js';
import { CreateEventNoteDto } from '../dto/admin-note.dto.js';
import { EventNote } from '../entities/event-note.entity.js';

/**
 * Controlador administrativo para notas colaborativas e incidencias durante la ruta.
 */
@Controller('admin/notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminNotesController {
  /**
   * Inyecta el servicio de administración de notas colaborativas.
   * @param adminNotesService Servicio administrativo de notas.
   */
  constructor(private readonly adminNotesService: AdminNotesService) {}

  /**
   * Obtiene la bitácora de notas de eventos, opcionalmente filtrada por ruta.
   * @param routeId Identificador opcional de la ruta.
   * @returns Lista de notas de eventos.
   */
  @Get()
  async getNotes(@Query('routeId') routeId?: string): Promise<EventNote[]> {
    return this.adminNotesService.getNotes(routeId);
  }

  /**
   * Registra una nueva nota en la bitácora para la ruta actual.
   * @param user Usuario autenticado.
   * @param dto Datos de la nota de evento.
   * @returns Nota creada.
   */
  @Post()
  async createNote(
    @CurrentUser() user: User,
    @Body() dto: CreateEventNoteDto,
  ): Promise<EventNote> {
    return this.adminNotesService.createNote(user.id, user.fullName, dto);
  }

  /**
   * Elimina una nota de la bitácora.
   * @param id UUID de la nota a eliminar.
   * @returns Confirmación de éxito.
   */
  @Delete(':id')
  async deleteNote(@Param('id') id: string): Promise<{ /**
   * Confirmación de éxito.
   */
  success: boolean }> {
    return this.adminNotesService.deleteNote(id);
  }
}
