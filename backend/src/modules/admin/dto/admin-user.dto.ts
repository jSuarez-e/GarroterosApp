/**
 * @sdd
 * [Objetivo]: DTOs para la gestión administrativa de usuarios (creación, edición y consultas con filtros) (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Entrada: payloads validados con class-validator. Salida: objetos fuertemente tipados.
 * [Edge Cases]: Encriptación requerida para contraseñas de nuevas cuentas, validación estricta de roles y estados.
 */

// backend/src/modules/admin/dto/admin-user.dto.ts

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole, UserStatus } from '../../users/entities/user.entity.js';

/**
 *
 */
export class AdminCreateUserDto {
  /**
   *
   */
  @IsEmail()
  email: string;

  /**
   *
   */
  @IsString()
  @MinLength(6)
  password: string;

  /**
   *
   */
  @IsString()
  @IsNotEmpty()
  fullName: string;

  /**
   *
   */
  @IsEnum(UserRole)
  role: UserRole;

  /**
   *
   */
  @IsOptional()
  @IsString()
  phone?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

/**
 *
 */
export class AdminUpdateUserDto {
  /**
   *
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  /**
   *
   */
  @IsOptional()
  @IsString()
  phone?: string | null;

  /**
   *
   */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /**
   *
   */
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  /**
   *
   */
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

/**
 *
 */
export class AdminUserQueryDto {
  /**
   *
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   *
   */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /**
   *
   */
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
