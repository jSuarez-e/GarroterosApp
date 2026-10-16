/**
 * @sdd
 * [Objetivo]: Entidad TypeORM para la bitácora colaborativa de incidencias y notas operativas de los guías (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Persiste autor, título, descripción y nivel de severidad (INFO, WARNING, CRITICAL) durante el recorrido.
 * [Edge Cases]: Validación estricta con enum EventNoteSeverity, ordenación cronológica descendente.
 */

// backend/src/modules/admin/entities/event-note.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from '../../routes/entities/route.entity.js';

export enum EventNoteSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/**
 * Entidad que representa una nota u observación colaborativa de eventos durante la ruta.
 */
@Entity('event_notes')
export class EventNote {
  /**
   *
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Identificador UUID de la ruta a la que pertenece esta nota o novedad.
   */
  @Column({ name: 'route_id', type: 'uuid', nullable: true })
  routeId: string | null;

  /**
   * Ruta turística a la que pertenece esta nota.
   */
  @ManyToOne(() => Route, (route: Route) => route.notes, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'route_id' })
  route: Route | null;

  /**
   *
   */
  @Column({ type: 'uuid' })
  authorId: string;

  /**
   *
   */
  @Column({ type: 'varchar', length: 150 })
  authorName: string;

  /**
   *
   */
  @Column({ type: 'varchar', length: 200 })
  title: string;

  /**
   *
   */
  @Column({ type: 'text' })
  content: string;

  /**
   *
   */
  @Column({
    type: 'enum',
    enum: EventNoteSeverity,
    default: EventNoteSeverity.INFO,
  })
  severity: EventNoteSeverity;

  /**
   *
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
