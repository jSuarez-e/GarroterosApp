/**
 * @sdd
 * [Objetivo]: Controlador REST para autenticacion y verificacion de sesion (SDD-002-AUTH-RBAC).
 * [I/O]: POST /api/v1/auth/login, GET /api/v1/auth/profile.
 * [Edge Cases]: Zero auto-registration, decoradores OpenAPI completos, codigos HTTP estrictos (200, 400, 401, 403).
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthSuccessPayload } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

/**
 *
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  /**
   *
   * @param authService
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint de inicio de sesion estricto sin auto-registro.
   * @param loginDto Credenciales validadas via ValidationPipe.
   * @returns Token JWT y datos del usuario.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesion de usuario',
    description: 'Valida credenciales con email RFC 5322 y contraseña minima de 6 caracteres. Emite JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticación exitosa. Retorna JWT Bearer y perfil de usuario.',
  })
  @ApiResponse({
    status: 400,
    description: 'Formato de credenciales inválido (ValidationPipe error).',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas (anti-enumeración).',
  })
  @ApiResponse({
    status: 403,
    description: 'Cuenta suspendida o inactiva.',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthSuccessPayload> {
    return this.authService.login(loginDto);
  }

  /**
   * Endpoint para la renovacion silenciosa de tokens JWT de sesion.
   * @param refreshTokenDto DTO con el refresh token emitido previamente.
   * @returns Nuevo par de tokens y datos de usuario.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar sesion con refresh token',
    description: 'Valida el refresh token criptografico y emite un nuevo par de tokens para evitar la perdida de sesion en ruta.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión renovada exitosamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token expirado o inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Cuenta suspendida o inactiva.',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthSuccessPayload> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  /**
   * Obtiene los datos del usuario autenticado segun el Bearer Token enviado.
   * @param user Usuario inyectado por JwtStrategy.
   * @returns Datos del usuario.
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil recuperado exitosamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado / Token ausente o invalido.' })
  getProfile(@CurrentUser() user: User): User {
    return user;
  }
}
