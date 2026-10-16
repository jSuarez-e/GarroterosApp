/**
 * @sdd
 * [Objetivo]: Entidad TypeORM para persistencia historica / auditoria en frio (Cold State) de telemetria GPS (SDD-003-TELEMETRY-REALTIME).
 * [I/O]: Persiste coordenadas PostGIS, metricas de desplazamiento, bateria y estado de emergencia SOS.
 * [Edge Cases]: Uso de 'import type { Point }' para evitar TS1272 con isolatedModules.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { Point } from 'typeorm';

/**
 *
 */
@Entity('telemetry_logs')
export class TelemetryLog {
  /**
   *
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   *
   */
  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  /**
   *
   */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  /**
   *
   */
  @Column({ type: 'float', nullable: true })
  altitude: number | null;

  /**
   *
   */
  @Column({ type: 'float', nullable: true })
  speed: number | null;

  /**
   *
   */
  @Column({ type: 'float', nullable: true })
  heading: number | null;

  /**
   *
   */
  @Column({ type: 'float', nullable: true })
  accuracy: number | null;

  /**
   *
   */
  @Column({ type: 'float', nullable: true })
  batteryLevel: number | null;

  /**
   *
   */
  @Column({ type: 'boolean', default: false })
  isSos: boolean;

  /**
   *
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  sosMessage: string | null;

  /**
   *
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
