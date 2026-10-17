/**
 * @sdd
 * [Objetivo]: Entidad TypeORM que define la tabla persistente de guías turísticos oficiales de Piedecuesta.
 * [I/O]: Almacena datos profesionales, biografía, certificaciones, calificaciones y relación ManyToMany con rutas.
 * [Edge Cases]: Email único, campos opcionales tipados estrictamente con null y soft-status para desactivación.
 */

// backend/src/modules/guides/entities/guide.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from '../../routes/entities/route.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * Entidad que representa la tabla 'guides' en la base de datos PostgreSQL.
 */
@Entity('guides')
export class Guide {
  /**
   * Identificador único UUID del guía.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nombre completo del guía turístico.
   */
  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  /**
   * Correo electrónico único del guía.
   */
  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  /**
   * Teléfono de contacto directo (móvil o WhatsApp).
   */
  @Column({ type: 'varchar', length: 30 })
  phone: string;

  /**
   * URL de la fotografía de perfil o avatar del guía.
   */
  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  /**
   * Reseña biográfica y perfil profesional.
   */
  @Column({ type: 'text', nullable: true })
  bio: string | null;

  /**
   * Lista de certificaciones y acreditaciones oficiales.
   */
  @Column({ type: 'simple-array', nullable: true })
  certifications: string[];

  /**
   * Calificación promedio otorgada por los excursionistas (1.0 - 5.0).
   */
  @Column({ type: 'decimal', precision: 3, scale: 1, default: 5.0 })
  rating: number;

  /**
   * Años de experiencia en guianza y rescate.
   */
  @Column({ name: 'experience_years', type: 'int', default: 1 })
  experienceYears: number;

  /**
   * Estado operativo del guía en el sistema ('ACTIVE' o 'INACTIVE').
   */
  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  /**
   * Identificador opcional del usuario del sistema si tiene cuenta de acceso vinculada.
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /**
   * Cuenta de usuario vinculada para autenticación y control RBAC.
   */
  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  /**
   * Rutas turísticas en las que este guía se encuentra asignado.
   */
  @ManyToMany(() => Route, (route: Route) => route.guides)
  routes: Route[];

  /**
   * Fecha de registro del guía.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Fecha de última actualización del perfil.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
