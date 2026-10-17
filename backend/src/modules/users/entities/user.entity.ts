/**
 * @sdd
 * [Objetivo]: Entidad TypeORM para persistencia relacional de cuentas de usuario, roles RBAC y estados (SDD-002-AUTH-RBAC).
 * [I/O]: Mapea tabla 'users'. Expone campos id (UUID), email (unico), passwordHash (oculto en select), role, status y timestamps.
 * [Edge Cases]: Exclusion de passwordHash en consultas convencionales con select: false, unicidad estricta en email.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from '../../routes/entities/route.entity.js';

/**
 * Roles de usuario admitidos en la plataforma para autorizacion RBAC.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/**
 * Estados del ciclo de vida de la cuenta de usuario.
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Entidad de persistencia para usuarios y credenciales del sistema.
 */
@Entity('users')
export class User {
  /**
   * Identificador único UUID del usuario.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Correo electrónico único del usuario.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  email: string;

  /**
   * Hash seguro de la contraseña (bcrypt).
   */
  @Column({ type: 'varchar', select: false })
  passwordHash: string;

  /**
   * Nombre completo del usuario.
   */
  @Column({ type: 'varchar', length: 100 })
  fullName: string;

  /**
   * Rol asignado para control de acceso RBAC.
   */
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  /**
   * Estado de la cuenta de usuario.
   */
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  /**
   * Teléfono de contacto opcional.
   */
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  /**
   * URL del avatar de perfil.
   */
  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  /**
   * Identificador UUID de la ruta turística asignada al usuario.
   */
  @Column({ name: 'route_id', type: 'uuid', nullable: true })
  routeId: string | null;

  /**
   * Ruta turística a la que está asignado el usuario.
   */
  @ManyToOne(() => Route, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'route_id' })
  route?: Route | null;

  /**
   * Fecha de creación del registro.
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   * Fecha de última actualización del registro.
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}