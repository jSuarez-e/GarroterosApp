/**
 * @sdd
 * [Objetivo]: Modulo raiz de la aplicacion backend NestJS (SDD-002-AUTH-RBAC).
 * [I/O]: Configura TypeOrmModule con PostgreSQL/PostGIS, ConfigModule global, AuthModule y UsersModule.
 * [Edge Cases]: Conexion resiliente con variables de entorno validadas, prevencion de credenciales expuestas.
 */

import { Module } from '@nestjs/common';
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
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'tour_admin'),
        password: configService.get<string>('DB_PASSWORD') || '',
        database: configService.get<string>('DB_NAME', 'guianza_turistica_db'),
        entities: [User, Waypoint, TelemetryLog, MedicalProfile, RouteLogEntry, EventNote, Guide, Route, SosAlert],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
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
