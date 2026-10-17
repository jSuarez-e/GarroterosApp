/**
 * @sdd
 * [Objetivo]: DTOs de validación y Swagger para el directorio y gestión de guías turísticos.
 * [I/O]: Define CreateGuideDto, UpdateGuideDto y GuideQueryDto con class-validator y @nestjs/swagger.
 * [Edge Cases]: Validación estricta de emails, arrays de certificaciones y rangos numéricos.
 */

// backend/src/modules/guides/dto/guide.dto.ts

import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/**
 * DTO para la creación de un nuevo guía turístico en la base de datos.
 */
export class CreateGuideDto {
  /**
   * Nombre completo del guía.
   */
  @ApiProperty({ description: 'Nombre completo del guía', example: 'Julio Carrillo' })
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @IsString()
  fullName: string;

  /**
   * Correo electrónico del guía.
   */
  @ApiProperty({ description: 'Correo electrónico único del guía', example: 'julio@garroterosapp.com' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido' })
  email: string;

  /**
   * Teléfono de contacto directo.
   */
  @ApiProperty({ description: 'Teléfono de contacto móvil o WhatsApp', example: '+573007654321' })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @IsString()
  phone: string;

  /**
   * URL de la fotografía de perfil.
   */
  @ApiPropertyOptional({ description: 'URL de la fotografía del guía' })
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  /**
   * Reseña biográfica o perfil profesional.
   */
  @ApiPropertyOptional({ description: 'Reseña biográfica del guía' })
  @IsOptional()
  @IsString()
  bio?: string | null;

  /**
   * Lista de certificaciones del guía.
   */
  @ApiPropertyOptional({ description: 'Certificaciones obtenidas', example: ['SENA Guianza Turística', 'Primeros Auxilios WFR'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  /**
   * Calificación promedio (1.0 a 5.0).
   */
  @ApiPropertyOptional({ description: 'Calificación promedio inicial', example: 4.9 })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  rating?: number;

  /**
   * Años de experiencia en guianza turística.
   */
  @ApiPropertyOptional({ description: 'Años de experiencia profesional', example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  /**
   * Estado operativo inicial.
   */
  @ApiPropertyOptional({ description: 'Estado operativo', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  /**
   * Identificadores de rutas turísticas asociadas al guía.
   */
  @ApiPropertyOptional({ description: 'IDs de rutas asignadas al guía', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  routeIds?: string[];

  /**
   * Contraseña inicial de acceso a la plataforma para el usuario vinculado.
   */
  @ApiPropertyOptional({ description: 'Contraseña inicial para iniciar sesión con rol GUIDE', example: 'Guia2026*' })
  @IsOptional()
  @IsString()
  initialPassword?: string;

  /**
   * Identificador UUID de la cuenta de usuario vinculada si ya existe.
   */
  @ApiPropertyOptional({ description: 'UUID de usuario vinculado' })
  @IsOptional()
  @IsString()
  userId?: string | null;
}

/**
 * DTO para la actualización parcial de un guía turístico.
 */
export class UpdateGuideDto extends PartialType(CreateGuideDto) {}

/**
 * DTO para filtrado y consulta de guías.
 */
export class GuideQueryDto {
  /**
   * Término de búsqueda por nombre o correo.
   */
  @ApiPropertyOptional({ description: 'Término de búsqueda opcional' })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Identificador de ruta para filtrar los guías asignados a un recorrido específico.
   */
  @ApiPropertyOptional({ description: 'ID de ruta para filtrar guías asignados' })
  @IsOptional()
  @IsString()
  routeId?: string;
}
