/**
 * @sdd
 * [Objetivo]: Entidad TypeORM para persistencia, seguimiento de estado y notas de atencion de alertas SOS (SDD-003-TELEMETRY-REALTIME & SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Almacena coordenadas PostGIS, usuario emisor, fecha, estado SosAlertStatus, guia responsable y bitacora del suceso.
 * [Edge Cases]: Uso de 'import type { Point }' para evitar TS1272 con isolatedModules.
 */

// backend/src/modules/admin/entities/sos-alert.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Point } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

/**
 * Estados del ciclo de vida de una alerta de emergencia SOS.
 */
export enum SosAlertStatus {
  PENDING = 'PENDING',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
  RESOLVED = 'RESOLVED',
}

/**
 * Entidad que representa una alerta de auxilio/emergencia SOS emitida en ruta.
 */
@Entity('sos_alerts')
export class SosAlert {
  /**
   * Identificador unico UUID del incidente.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Identificador del usuario que genero el SOS.
   */
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /**
   * Usuario emisor de la emergencia.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Nombre capturado al momento de la alerta para auditoria rapida.
   */
  @Column({ name: 'user_name', type: 'varchar', length: 150 })
  userName: string;

  /**
   * Correo del usuario registrado.
   */
  @Column({ name: 'user_email', type: 'varchar', length: 150, nullable: true })
  userEmail: string | null;

  /**
   * Telefono de contacto del usuario.
   */
  @Column({ name: 'user_phone', type: 'varchar', length: 50, nullable: true })
  userPhone: string | null;

  /**
   * Ubicacion espacial Point (SRID 4326) de la emergencia.
   */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  /**
   * Altitud sobre el nivel del mar en metros.
   */
  @Column({ type: 'float', nullable: true })
  altitude: number | null;

  /**
   * Nivel de bateria del dispositivo en porcentaje (0-100).
   */
  @Column({ name: 'battery_level', type: 'float', nullable: true })
  batteryLevel: number | null;

  /**
   * Mensaje descriptivo o motivo de la alerta.
   */
  @Column({ type: 'varchar', length: 255 })
  message: string;

  /**
   * Estado de atencion de la alerta (PENDING, ATTENDED, CANCELLED, RESOLVED).
   */
  @Index()
  @Column({
    type: 'enum',
    enum: SosAlertStatus,
    default: SosAlertStatus.PENDING,
  })
  status: SosAlertStatus;

  /**
   * Identificador del guia o administrador que gestiono o cancelo la alerta.
   */
  @Column({ name: 'resolved_by_id', type: 'uuid', nullable: true })
  resolvedById: string | null;

  /**
   * Nombre del guia o administrador responsable de la atencion/cierre.
   */
  @Column({ name: 'resolved_by_name', type: 'varchar', length: 150, nullable: true })
  resolvedByName: string | null;

  /**
   * Nota o bitacora del suceso explicativa al marcar o cancelar la notificacion.
   */
  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;

  /**
   * Fecha y hora en que fue atendida o cancelada la alerta.
   */
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  /**
   * Fecha y hora de solicitud original de la alerta SOS.
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /**
   * Fecha y hora de ultima actualizacion.
   */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
