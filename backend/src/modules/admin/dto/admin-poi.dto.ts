/**
 * @sdd
 * [Objetivo]: DTOs para la administración, georreferenciación y multimedia de Puntos de Interés / POIs (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Entrada: coordenadas (latitude, longitude), título, descripción, audio y fotos. Salida: objetos tipados.
 * [Edge Cases]: Validación numérica de latitud (-90 a 90) y longitud (-180 a 180), arrays de URLs para fotografías.
 */

// backend/src/modules/admin/dto/admin-poi.dto.ts

import {
  IsArray,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/**
 *
 */
export class AdminCreatePoiDto {
  /**
   * Identificador UUID de la ruta a la que pertenece el POI.
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
  @IsString()
  @IsNotEmpty()
  description: string;

  /**
   *
   */
  @IsInt()
  @Min(0)
  orderIndex: number;

  /**
   *
   */
  @IsNumber()
  @IsLatitude()
  latitude: number;

  /**
   *
   */
  @IsNumber()
  @IsLongitude()
  longitude: number;

  /**
   *
   */
  @IsOptional()
  @IsString()
  audioUrl?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[] | null;
}

/**
 *
 */
export class AdminUpdatePoiDto {
  /**
   * Identificador UUID de la ruta a la que pertenece el POI.
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
  @IsString()
  @IsNotEmpty()
  description?: string;

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
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  /**
   *
   */
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  /**
   *
   */
  @IsOptional()
  @IsString()
  audioUrl?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[] | null;
}
