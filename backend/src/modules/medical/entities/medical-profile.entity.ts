/**
 * @sdd
 * [Objetivo]: Entidad TypeORM para persistencia relacional de la ficha médica y confirmación de asistencia (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Vinculada al identificador del usuario (userId). Almacena estado de asistencia, condiciones médicas, alergias, medicamentos, tipo de dieta y contactos de emergencia.
 * [Edge Cases]: Unicidad por usuario con índice único en userId, campos de texto opcionales tratados de forma segura con nullable.
 */

// backend/src/modules/medical/entities/medical-profile.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DietType {
  REGULAR = 'REGULAR',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  CELIAC = 'CELIAC',
  OTHER = 'OTHER',
}

/**
 *
 */
@Entity('medical_profiles')
export class MedicalProfile {
  /**
   *
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   *
   */
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  /**
   * Estado de confirmación de asistencia del excursionista a la ruta oficial.
   */
  @Column({ type: 'boolean', default: false })
  attendanceConfirmed: boolean;

  /**
   *
   */
  @Column({ type: 'text', nullable: true })
  medicalConditions: string | null;

  /**
   *
   */
  @Column({ type: 'text', nullable: true })
  allergies: string | null;

  /**
   *
   */
  @Column({ type: 'text', nullable: true })
  medications: string | null;

  /**
   *
   */
  @Column({ type: 'enum', enum: DietType, default: DietType.REGULAR })
  dietType: DietType;

  /**
   *
   */
  @Column({ type: 'varchar', length: 150, nullable: true })
  emergencyContactName: string | null;

  /**
   *
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  emergencyContactPhone: string | null;

  /**
   *
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  bloodType: string | null;

  /**
   *
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Fotografia o avatar del usuario para identificacion visual en ruta.
   */
  @Column({ type: 'text', nullable: true })
  photoUrl: string | null;

  /**
   *
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   *
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
