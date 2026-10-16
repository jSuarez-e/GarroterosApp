/**
 * @sdd
 * [Objetivo]: Entidad TypeORM para persistencia y consulta espacial de Puntos de Interes / POIs (SDD-004-MAP-MULTIMEDIA-WEATHER).
 * [I/O]: Almacena titulo, descripcion cultural, indice de itinerario, coordenadas PostGIS Point (SRID 4326) y URLs multimedia.
 * [Edge Cases]: Uso estricto de 'import type { Point }' para evitar error TS1272 con isolatedModules. Coordenadas [longitud, latitud].
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Point } from 'typeorm';
import { Route } from './route.entity.js';

/**
 * Entidad Waypoint que representa un punto de interes cultural/historico en la ruta.
 */
@Entity('waypoints')
export class Waypoint {
  /**
   *
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   *
   */
  @Column({ type: 'varchar', length: 150 })
  title: string;

  /**
   *
   */
  @Column({ type: 'text' })
  description: string;

  /**
   *
   */
  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  /**
   * Coordenadas geograficas PostGIS en formato GeoJSON Point: { type: 'Point', coordinates: [longitud, latitud] }
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
  @Column({ type: 'varchar', nullable: true })
  audioUrl: string | null;

  /**
   *
   */
  @Column('simple-array', { nullable: true })
  photoUrls: string[] | null;

  /**
   * Identificador UUID de la ruta a la que pertenece este waypoint.
   */
  @Column({ name: 'route_id', type: 'uuid', nullable: true })
  routeId: string | null;

  /**
   * Ruta turística a la que pertenece este punto de interés.
   */
  @ManyToOne(() => Route, (route: Route) => route.waypoints, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'route_id' })
  route: Route | null;
}