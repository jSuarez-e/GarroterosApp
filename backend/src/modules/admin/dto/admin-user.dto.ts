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
  IsUUID,
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

  /**
   * Identificador UUID de la ruta turística asignada.
   */
  @IsOptional()
  @IsUUID()
  routeId?: string | null;
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

  /**
   * Identificador UUID de la ruta turística asignada.
   */
  @IsOptional()
  @IsUUID()
  routeId?: string | null;
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

  /**
   * Filtro por ruta turística asignada.
   */
  @IsOptional()
  @IsUUID()
  routeId?: string;
}

/**
 * Payload para asignación directa de ruta a un usuario.
 */
export class AdminAssignUserRouteDto {
  /**
   * Identificador UUID de la ruta turística asignada o null para remover asignación.
   */
  @IsOptional()
  @IsUUID()
  routeId?: string | null;
}

/** Resumen de información médica de emergencia para el guía en campo */
export interface IRouteParticipantMedicalSummary {
  /** Tipo de sangre del usuario */
  bloodType: string | null;
  /** Alergias conocidas */
  allergies: string | null;
  /** Tipo de dieta */
  dietType: string | null;
  /** Nombre del contacto de emergencia */
  emergencyContactName: string | null;
  /** Teléfono del contacto de emergencia */
  emergencyContactPhone: string | null;
  /** Condiciones médicas o patologías previas */
  medicalConditions: string | null;
  /** Medicamentos suministrados actualmente */
  medications: string | null;
  /** Observaciones o notas adicionales */
  notes: string | null;
}

/** Información del participante/usuario asignado a una ruta para control de asistencia */
export interface IRouteRosterParticipant {
  /** Identificador único del usuario */
  userId: string;
  /** Nombre completo */
  fullName: string;
  /** Correo electrónico */
  email: string;
  /** Teléfono de contacto */
  phone: string | null;
  /** Avatar de perfil de usuario */
  avatarUrl: string | null;
  /** Fotografía subida por el usuario en ficha médica */
  photoUrl: string | null;
  /** Si el usuario ya aceptó la ruta y confirmó asistencia */
  attendanceConfirmed: boolean;
  /** Si el usuario ya completó el diligenciamiento de la ficha médica */
  hasMedicalProfile: boolean;
  /** Fecha de última actualización médica (ISO) */
  medicalUpdatedAt?: string | null;
  /** Resumen médico de emergencia */
  medicalSummary: IRouteParticipantMedicalSummary | null;
}

/** Guía asignado a una ruta */
export interface IRouteAssignedGuide {
  /** Identificador único del guía */
  id: string;
  /** Nombre completo del guía */
  fullName: string;
  /** Teléfono de contacto */
  phone: string | null;
  /** Avatar del guía */
  avatarUrl: string | null;
}

/** Modelo de ruta activa con sus participantes asignados para el guía */
export interface IGuideRouteRoster {
  /** Identificador UUID de la ruta */
  routeId: string;
  /** Nombre de la ruta turística */
  routeName: string;
  /** Municipio o ubicación */
  municipality: string;
  /** Distancia total en kilómetros */
  totalDistanceKm: number;
  /** Duración estimada en minutos */
  estimatedDurationMinutes: number;
  /** Indica si es la ruta oficial activa en el sistema */
  isActive: boolean;
  /** Guías asignados a este recorrido */
  guides: IRouteAssignedGuide[];
  /** Total de usuarios asignados */
  totalParticipants: number;
  /** Total de usuarios con asistencia confirmada */
  confirmedParticipants: number;
  /** Porcentaje de asistencia confirmada (0 - 100) */
  attendanceRatePercentage: number;
  /** Lista de participantes asignados a esta ruta */
  participants: IRouteRosterParticipant[];
}

