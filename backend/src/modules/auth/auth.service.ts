/**
 * @sdd
 * [Objetivo]: Servicio principal de autenticacion, emision de JWT y RBAC (SDD-002-AUTH-RBAC).
 * [I/O]: Entrada: LoginDto. Salida: AuthResponse con accessToken y datos de usuario sanitizados.
 * [Edge Cases]: Mitigacion de ataques de enumeracion con 401 generico, verificacion de estado inactivo con 403, bcrypt 10 rounds.
 */

import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { User, UserStatus } from '../users/entities/user.entity.js';

/**
 *
 */
export interface AuthSuccessPayload {
  /**
   *
   */
  accessToken: string;
  /**
   *
   */
  refreshToken: string;
  /**
   *
   */
  user: {
    /**
     *
     */
    id: string;
    /**
     *
     */
    email: string;
    /**
     *
     */
    fullName: string;
    /**
     *
     */
    role: string;
    /**
     *
     */
    status: UserStatus;
    /**
     *
     */
    phone?: string | null;
    /**
     *
     */
    avatarUrl?: string | null;
  };
}

/**
 * Par de tokens emitidos para autenticacion y renovacion silenciosa.
 */
export interface AuthTokenPair {
  /**
   * Token de acceso JWT de corta vigencia.
   */
  accessToken: string;
  /**
   * Token de renovacion JWT de larga vigencia.
   */
  refreshToken: string;
}

/**
 * Carga util decodificada del token de renovacion JWT.
 */
export interface RefreshTokenJwtPayload {
  /**
   * Identificador UUID del usuario.
   */
  sub: string;
  /**
   * Indicador del tipo de token.
   */
  tokenType?: string;
}

/**
 * Servicio encargado de la logica de negocio para inicio de sesion y verificacion de credenciales.
 */
@Injectable()
export class AuthService {
  /**
   *
   */
  private readonly logger = new Logger(AuthService.name);

  /**
   *
   * @param usersService
   * @param jwtService
   * @param configService
   */
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtiene la clave secreta para la firma y verificacion de tokens de renovacion.
   * @returns Secreto de refresh token.
   */
  private getRefreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      `${this.configService.get<string>('JWT_SECRET')}__refresh`
    );
  }

  /**
   * Obtiene el tiempo de expiracion configurado para los refresh tokens.
   * @returns Tiempo en formato string (ej: 30d).
   */
  private getRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '30d';
  }

  /**
   * Genera el par criptografico de tokens (accessToken y refreshToken).
   * @param user Entidad de usuario autenticada.
   * @returns Objeto con accessToken y refreshToken.
   */
  private generateTokens(user: User): AuthTokenPair {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenType: 'refresh' },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiresIn() as unknown as number,
      },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Autentica un usuario verificando correo y contraseña con mitigacion de ataques de enumeracion.
   * @param loginDto Credenciales de acceso (email y password).
   * @returns Token de acceso JWT, refresh token y objeto de usuario seguro.
   * @throws UnauthorizedException si las credenciales son invalidas o el usuario no existe.
   * @throws ForbiddenException si el usuario se encuentra en estado inactivo.
   */
  async login(loginDto: LoginDto): Promise<AuthSuccessPayload> {
    const { email, password } = loginDto;

    // Busqueda con seleccion explicita de passwordHash
    const user = await this.usersService.findByEmailWithPassword(email);

    // Resistencia a enumeracion: mensaje generico identico para usuario inexistente o password incorrecto
    if (!user || !user.passwordHash) {
      this.logger.warn(`Intento de login fallido para cuenta no registrada: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Intento de login con contraseña incorrecta para: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Validacion de estado de la cuenta
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Intento de inicio de sesion bloqueado por estado ${user.status} en: ${email}`);
      throw new ForbiddenException('Cuenta suspendida o inactiva');
    }

    const tokens = this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  /**
   * Renueva las credenciales del usuario validando criptograficamente el refresh token.
   * @param dto DTO con el refreshToken a validar.
   * @returns Nuevo par de tokens y datos de usuario.
   * @throws UnauthorizedException si el token es invalido, expirado o el usuario ya no existe.
   * @throws ForbiddenException si la cuenta del usuario fue desactivada.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<AuthSuccessPayload> {
    try {
      const decoded = await this.jwtService.verifyAsync<RefreshTokenJwtPayload>(
        dto.refreshToken,
        {
          secret: this.getRefreshSecret(),
        },
      );

      if (decoded.tokenType !== 'refresh' || !decoded.sub) {
        throw new UnauthorizedException('Token de renovación inválido');
      }

      const user = await this.usersService.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('Cuenta suspendida o inactiva');
      }

      const tokens = this.generateTokens(user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.warn(`Fallo en renovación de token: ${(error as Error).message}`);
      throw new UnauthorizedException('Refresh token expirado o inválido');
    }
  }

  /**
   * Valida un usuario por ID devolviendo la entidad sin la contraseña.
   * @param id Identificador UUID.
   * @returns Entidad User.
   */
  async validateUserById(id: string): Promise<User> {
    return this.usersService.findById(id);
  }
}
