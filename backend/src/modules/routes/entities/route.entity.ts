/**
 * @sdd
 * [Objetivo]: Entidad TypeORM que define la tabla persistente de rutas turísticas oficiales ('routes').
 * [I/O]: Almacena trazados, distancias, polilínea GeoJSON, bandera de ruta activa y relación ManyToMany con guías.
 * [Edge Cases]: Validación de distancias positivas, coordenadas en formato GeoJSON [lng, lat] y unicidad de ruta activa.
 */

// backend/src/modules/routes/entities/route.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Guide } from '../../guides/entities/guide.entity.js';
import { Waypoint } from './waypoint.entity.js';
import { RouteLogEntry } from '../../admin/entities/route-log-entry.entity.js';
import { EventNote } from '../../admin/entities/event-note.entity.js';

/**
 * Entidad que representa la tabla 'routes' en la base de datos PostgreSQL.
 */
@Entity('routes')
export class Route {
  /**
   * Identificador único UUID de la ruta turística.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nombre oficial del recorrido o sendero.
   */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /**
   * Municipio, departamento y locación de la ruta.
   */
  @Column({ type: 'varchar', length: 150, default: 'Piedecuesta, Santander' })
  municipality: string;

  /**
   * Descripción histórica y cultural detallada del sendero.
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Distancia total estimada del sendero en kilómetros.
   */
  @Column({ name: 'total_distance_km', type: 'decimal', precision: 5, scale: 2, default: 2.1 })
  totalDistanceKm: number;

  /**
   * Duración estimada del recorrido en minutos.
   */
  @Column({ name: 'estimated_duration_minutes', type: 'int', default: 50 })
  estimatedDurationMinutes: number;

  /**
   * Arreglo de coordenadas GeoJSON [longitud, latitud] que trazan el sendero.
   */
  @Column({ type: 'jsonb', nullable: true })
  coordinates: [number, number][];

  /**
   * Bandera que determina si esta ruta es el recorrido oficial activo mostrado en la aplicación.
   */
  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  /**
   * Guías turísticos asignados a este recorrido.
   */
  @ManyToMany(() => Guide, (guide: Guide) => guide.routes)
  @JoinTable({
    name: 'route_guides',
    joinColumn: { name: 'route_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'guide_id', referencedColumnName: 'id' },
  })
  guides: Guide[];

  /**
   * Waypoints y puntos de interés georreferenciados asignados a esta ruta.
   */
  @OneToMany(() => Waypoint, (wp: Waypoint) => wp.route)
  waypoints: Waypoint[];

  /**
   * Hitos y cronograma operativo del itinerario para esta ruta.
   */
  @OneToMany(() => RouteLogEntry, (log: RouteLogEntry) => log.route)
  itinerary: RouteLogEntry[];

  /**
   * Bitácora de notas e incidencias registradas en esta ruta.
   */
  @OneToMany(() => EventNote, (note: EventNote) => note.route)
  notes: EventNote[];

  /**
   * Fecha de creación de la ruta.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Fecha de última modificación.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
