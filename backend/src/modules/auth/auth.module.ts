/**
 * @sdd
 * [Objetivo]: Modulo NestJS de autenticacion y control de acceso (SDD-002-AUTH-RBAC).
 * [I/O]: Registra PassportModule, JwtModule asincrono con ConfigService, exporta AuthService, JwtAuthGuard y RolesGuard.
 * [Edge Cases]: Prevencion de secretos quemados mediante inyeccion de JWT_SECRET desde ConfigService.
 */

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

/**
 * Modulo de autenticacion, autorizacion y gestion de tokens JWT.
 */
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      /**
       * Fabrica de configuracion asincrona para JwtModule.
       * @param configService Servicio de configuracion.
       * @returns Opciones de firma y clave secreta del token JWT.
       */
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET no configurado en variables de entorno');
        }
        const expiresIn = (configService.get<string>('JWT_EXPIRATION') || '24h') as unknown as number;
        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
