/**
 * @sdd
 * [Objetivo]: Estrategia Passport JWT para autenticacion stateless y validacion de claims (SDD-002-AUTH-RBAC).
 * [I/O]: Entrada: Header Authorization Bearer. Salida: Entidad User validada en el Request.
 * [Edge Cases]: Rechaza usuarios inactivos con HTTP 403 y tokens invalidos o revocados con HTTP 401.
 */

import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { UsersService } from '../../users/users.service.js';
import { User, UserStatus } from '../../users/entities/user.entity.js';

/**
 * Estructura interna del payload decodificado del JWT.
 */
interface JwtPayloadInternal {
  /**
   * Identificador UUID del usuario sujeto del token.
   */
  sub: string;
  /**
   * Correo electronico del usuario.
   */
  email: string;
  /**
   * Rol del usuario para RBAC.
   */
  role: string;
  /**
   * Nombre completo del usuario.
   */
  fullName: string;
  /**
   * Marca de tiempo de emision (Issued At).
   */
  iat?: number;
  /**
   * Marca de tiempo de expiracion.
   */
  exp?: number;
}

/**
 * Estrategia Passport para extraccion y validacion de tokens JWT.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Inicializa la estrategia validando la clave secreta desde variables de entorno.
   * @param configService Servicio de configuracion de NestJS.
   * @param usersService Servicio de usuarios para resolucion de cuenta.
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET no configurado en variables de entorno');
    }
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    };
    super(options);
  }

  /**
   * Valida el payload decodificado del JWT consultando el estado actual del usuario en la base de datos.
   * @param payload Payload contenido en el token.
   * @returns Entidad User sanitizada.
   * @throws UnauthorizedException si el usuario no existe.
   * @throws ForbiddenException si la cuenta esta inactiva.
   */
  async validate(payload: JwtPayloadInternal): Promise<User> {
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('Token no valido o usuario inexistente');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Cuenta suspendida o inactiva');
    }

    return user;
  }
}
