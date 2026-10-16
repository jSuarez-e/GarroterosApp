/**
 * @sdd
 * [Objetivo]: DTOs para la creación y actualización de hitos en la bitácora e itinerario de ruta (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Entrada: payloads validados con class-validator. Salida: objetos tipados.
 * [Edge Cases]: Validación del enum ItineraryStatus, orden secuencial e identificador de waypoint opcional.
 */

// backend/src/modules/admin/dto/admin-log.dto.ts

import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ItineraryStatus } from '../entities/route-log-entry.entity.js';

/**
 *
 */
export class CreateRouteLogEntryDto {
  /**
   * Identificador UUID de la ruta a la que pertenece este hito.
   */
  @IsOptional()
  @IsUUID()
  routeId?: string | null;

  /**
   *
   */
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   *
   */
  @IsInt()
  @Min(0)
  orderIndex: number;

  /**
   *
   */
  @IsString()
  @IsNotEmpty()
  plannedTime: string;

  /**
   *
   */
  @IsOptional()
  @IsUUID()
  waypointId?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  notes?: string | null;
}

/**
 *
 */
export class UpdateRouteLogEntryDto {
  /**
   * Identificador UUID de la ruta a la que pertenece este hito.
   */
  @IsOptional()
  @IsUUID()
  routeId?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  /**
   *
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  /**
   *
   */
  @IsOptional()
  @IsString()
  plannedTime?: string;

  /**
   *
   */
  @IsOptional()
  @IsString()
  actualTime?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsEnum(ItineraryStatus)
  status?: ItineraryStatus;

  /**
   *
   */
  @IsOptional()
  @IsString()
  notes?: string | null;
}
