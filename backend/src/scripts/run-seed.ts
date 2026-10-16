/**
 * @sdd
 * [Objetivo]: Script CLI ejecutable para poblar la base de datos con usuarios iniciales (SDD-002-AUTH-RBAC).
 * [I/O]: Inicializa DataSource de TypeORM con variables de entorno y ejecuta runUserSeeder.
 * [Edge Cases]: Destruye la conexion de forma limpia al finalizar o en caso de error.
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity.js';
import { Waypoint } from '../modules/routes/entities/waypoint.entity.js';
import { TelemetryLog } from '../modules/telemetry/entities/telemetry-log.entity.js';
import { runUserSeeder } from '../database/seeds/user.seeder.js';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'tour_admin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'guianza_turistica_db',
  entities: [User, Waypoint, TelemetryLog],
  synchronize: false,
});

/**
 * Funcion de arranque principal para la ejecucion del seeder CLI.
 * @returns Promesa resuelta tras finalizar el proceso de inicializacion y sembrado.
 */
async function main(): Promise<void> {
  try {
    await AppDataSource.initialize();
    await runUserSeeder(AppDataSource);
  } catch (error) {
    process.stderr.write(`Error en ejecucion de seeds: ${(error as Error).message}\n`);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void main();
