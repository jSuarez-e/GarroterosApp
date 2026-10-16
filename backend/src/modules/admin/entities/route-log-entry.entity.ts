/**
 * @sdd
 * [Objetivo]: Entidad TypeORM para la bitácora e itinerario cronológico de la ruta turística (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Persiste hitos planificados, orden secuencial, marcas de tiempo operativas (planeada vs real) y estado de cumplimiento.
 * [Edge Cases]: Enum ItineraryStatus (PENDING, IN_PROGRESS, COMPLETED, DELAYED). Campos de tiempo en string HH:mm para portabilidad horaria.
 */

// backend/src/modules/admin/entities/route-log-entry.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from '../../routes/entities/route.entity.js';

export enum ItineraryStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

/**
 * Entidad que representa un hito en la bitácora e itinerario de la ruta.
 */
@Entity('route_log_entries')
export class RouteLogEntry {
  /**
   *
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Identificador UUID de la ruta a la que pertenece este hito del itinerario.
   */
  @Column({ name: 'route_id', type: 'uuid', nullable: true })
  routeId: string | null;

  /**
   * Ruta turística a la que pertenece este hito.
   */
  @ManyToOne(() => Route, (route: Route) => route.itinerary, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'route_id' })
  route: Route | null;

  /**
   *
   */
  @Column({ type: 'varchar', length: 150 })
  title: string;

  /**
   *
   */
  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  /**
   *
   */
  @Column({ type: 'varchar', length: 20 })
  plannedTime: string;

  /**
   *
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  actualTime: string | null;

  /**
   *
   */
  @Column({
    type: 'enum',
    enum: ItineraryStatus,
    default: ItineraryStatus.PENDING,
  })
  status: ItineraryStatus;

  /**
   *
   */
  @Column({ type: 'uuid', nullable: true })
  waypointId: string | null;

  /**
   *
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
