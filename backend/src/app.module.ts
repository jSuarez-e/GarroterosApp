/**
 * @sdd
 * [Objetivo]: Modulo raiz de la aplicacion backend NestJS (SDD-002-AUTH-RBAC).
 * [I/O]: Configura TypeOrmModule con PostgreSQL/PostGIS, ConfigModule global, AuthModule y UsersModule.
 * [Edge Cases]: Conexion resiliente con variables de entorno validadas, prevencion de credenciales expuestas.
 */

import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { User } from './modules/users/entities/user.entity.js';
import { Waypoint } from './modules/routes/entities/waypoint.entity.js';
import { TelemetryLog } from './modules/telemetry/entities/telemetry-log.entity.js';
import { MedicalProfile } from './modules/medical/entities/medical-profile.entity.js';
import { RouteLogEntry } from './modules/admin/entities/route-log-entry.entity.js';
import { EventNote } from './modules/admin/entities/event-note.entity.js';
import { SosAlert } from './modules/admin/entities/sos-alert.entity.js';
import { Guide } from './modules/guides/entities/guide.entity.js';
import { Route } from './modules/routes/entities/route.entity.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { RedisModule } from './modules/redis/redis.module.js';
import { TelemetryModule } from './modules/telemetry/telemetry.module.js';
import { RoutesModule } from './modules/routes/routes.module.js';
import { MedicalModule } from './modules/medical/medical.module.js';
import { GuidesModule } from './modules/guides/guides.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

/**
 * Modulo principal y configuracion de la aplicacion backend NestJS.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      /**
       * Fabrica de configuracion asincrona para TypeORM.
       * @param configService Servicio de configuracion de entorno.
       * @returns Opciones de conexion para TypeORM con PostgreSQL.
       */
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const sslConfig = configService.get<string>('DATABASE_SSL');

        const isInternalRender =
          databaseUrl !== undefined &&
          (databaseUrl.includes('.internal') || (databaseUrl.includes('dpg-') && !databaseUrl.includes('.render.com')));
        const isLocal =
          databaseUrl !== undefined && (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1'));
        const useSsl =
          sslConfig === 'true'
            ? true
            : sslConfig === 'false'
              ? false
              : Boolean(databaseUrl) && !isInternalRender && !isLocal;

        const commonEntities = [User, Waypoint, TelemetryLog, MedicalProfile, RouteLogEntry, EventNote, Guide, Route, SosAlert];

        if (databaseUrl) {
          logger.log(
            `Conectando a PostgreSQL vía DATABASE_URL (${isInternalRender ? 'Render Red Interna (Sin SSL)' : `Externa/Cloud (SSL: ${useSsl})`})...`,
          );
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            ssl: useSsl ? { rejectUnauthorized: false } : false,
            connectTimeoutMS: 10000,
            extra: {
              connectionTimeoutMillis: 10000,
            },
            entities: commonEntities,
            synchronize: !isProduction,
          };
        }

        const host = configService.get<string>('DB_HOST', 'localhost');
        const port = configService.get<number>('DB_PORT', 5432);
        logger.warn(`DATABASE_URL no configurada. Intentando conexión local a PostgreSQL en ${host}:${port}...`);

        return {
          type: 'postgres' as const,
          host,
          port,
          username: configService.get<string>('DB_USER', 'tour_admin'),
          password: configService.get<string>('DB_PASSWORD') || '',
          database: configService.get<string>('DB_NAME', 'guianza_turistica_db'),
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          connectTimeoutMS: 10000,
          extra: {
            connectionTimeoutMillis: 10000,
          },
          entities: commonEntities,
          synchronize: !isProduction,
        };
      },
    }),
    UsersModule,
    AuthModule,
    RedisModule,
    TelemetryModule,
    RoutesModule,
    MedicalModule,
    GuidesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
