/**
 * @sdd
 * [Objetivo]: DTO para validar la creación o actualización de la ficha médica y asistencia del usuario (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Entrada: campos validados con class-validator. Salida: objeto tipado sin tipos 'any'.
 * [Edge Cases]: Validación estricta del enum DietType, sanitización de campos opcionales nulos o indefinidos.
 */

// backend/src/modules/medical/dto/save-medical-profile.dto.ts

import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { DietType } from '../entities/medical-profile.entity.js';

/**
 * DTO para validar la creación o actualización de la ficha médica y asistencia del usuario.
 */
export class SaveMedicalProfileDto {
  /**
   * Identificador único de confirmación de asistencia.
   */
  @IsBoolean()
  attendanceConfirmed: boolean;

  /**
   * Identificador UUID opcional de la ruta asignada al usuario.
   */
  @IsOptional()
  @IsUUID()
  routeId?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  medicalConditions?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  allergies?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  medications?: string | null;

  /**
   *
   */
  @IsEnum(DietType)
  dietType: DietType;

  /**
   *
   */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  emergencyContactName?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactPhone?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodType?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  notes?: string | null;

  /**
   * Fotografia o avatar del usuario para registro visual (opcional).
   */
  @IsOptional()
  @IsString()
  photoUrl?: string | null;
}
