/**
 * @sdd
 * [Objetivo]: DTOs de validación y Swagger para creación y actualización de rutas turísticas con asignación de guías.
 * [I/O]: Define CreateRouteDto y UpdateRouteDto validados con class-validator.
 * [Edge Cases]: Validación de arreglo de UUIDs de guías, distancias numéricas y coordenadas opcionales.
 */

// backend/src/modules/routes/dto/create-route.dto.ts

import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/**
 * DTO para la creación de una nueva ruta turística con selección de guías oficiales.
 */
export class CreateRouteDto {
  /**
   * Nombre oficial del recorrido.
   */
  @ApiProperty({ description: 'Nombre oficial del recorrido', example: 'Ruta Histórica y Cultural de los Garroteros' })
  @IsNotEmpty({ message: 'El nombre de la ruta es requerido' })
  @IsString()
  name: string;

  /**
   * Municipio o locación.
   */
  @ApiPropertyOptional({ description: 'Municipio o locación', example: 'Piedecuesta, Santander' })
  @IsOptional()
  @IsString()
  municipality?: string;

  /**
   * Descripción histórica y de recorrido.
   */
  @ApiProperty({ description: 'Descripción detallada del sendero' })
  @IsNotEmpty({ message: 'La descripción es requerida' })
  @IsString()
  description: string;

  /**
   * Distancia total estimada en kilómetros.
   */
  @ApiProperty({ description: 'Distancia total en kilómetros', example: 2.1 })
  @IsNumber()
  @Min(0.1, { message: 'La distancia debe ser mayor a 0 km' })
  totalDistanceKm: number;

  /**
   * Duración estimada del recorrido en minutos.
   */
  @ApiProperty({ description: 'Duración estimada en minutos', example: 50 })
  @IsNumber()
  @Min(1, { message: 'La duración estimada debe ser al menos de 1 minuto' })
  estimatedDurationMinutes: number;

  /**
   * Arreglo opcional de pares [longitud, latitud].
   */
  @ApiPropertyOptional({ description: 'Coordenadas GeoJSON [longitud, latitud]', example: [[-73.0501, 6.9877], [-73.0498, 6.9879]] })
  @IsOptional()
  @IsArray()
  coordinates?: [number, number][];

  /**
   * Si debe establecerse como la ruta oficial activa.
   */
  @ApiPropertyOptional({ description: 'Establecer como la ruta activa del sistema', default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * Hora de inicio programada del recorrido (formato HH:mm o HH:mm AM/PM).
   */
  @ApiPropertyOptional({ description: 'Hora de inicio programada', example: '08:30 AM' })
  @IsOptional()
  @IsString()
  startTime?: string | null;

  /**
   * Fecha de inicio programada del recorrido (formato YYYY-MM-DD).
   */
  @ApiPropertyOptional({ description: 'Fecha de inicio programada (YYYY-MM-DD)', example: '2026-10-25' })
  @IsOptional()
  @IsString()
  startDate?: string | null;

  /**
   * Fecha de culminación o finalización del recorrido (formato YYYY-MM-DD).
   */
  @ApiPropertyOptional({ description: 'Fecha final o de culminación (YYYY-MM-DD)', example: '2026-10-25' })
  @IsOptional()
  @IsString()
  endDate?: string | null;

  /**
   * Lista de identificadores UUID de los guías seleccionados para este recorrido.
   */
  @ApiProperty({ description: 'Arreglo de IDs de guías asignados a la ruta', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada identificador de guía debe ser un UUID válido' })
  guideIds: string[];
}

/**
 * DTO para la actualización parcial de una ruta existente.
 */
export class UpdateRouteDto extends PartialType(CreateRouteDto) {}
