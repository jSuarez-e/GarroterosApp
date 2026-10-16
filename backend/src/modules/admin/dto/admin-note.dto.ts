/**
 * @sdd
 * [Objetivo]: DTO para el registro de notas de eventos y bitácora en tiempo real por parte de los guías (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Entrada: title, content y severity. Salida: CreateEventNoteDto.
 * [Edge Cases]: Validación estricta de severidad (INFO, WARNING, CRITICAL) mediante class-validator.
 */

// backend/src/modules/admin/dto/admin-note.dto.ts

import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EventNoteSeverity } from '../entities/event-note.entity.js';

/**
 *
 */
export class CreateEventNoteDto {
  /**
   * Identificador UUID de la ruta a la que pertenece esta nota.
   */
  @IsOptional()
  @IsUUID()
  routeId?: string | null;

  /**
   *
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /**
   *
   */
  @IsString()
  @IsNotEmpty()
  content: string;

  /**
   *
   */
  @IsEnum(EventNoteSeverity)
  severity: EventNoteSeverity;
}
