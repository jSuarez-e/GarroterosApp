/**
 * @sdd
 * [Objetivo]: Guard global/modular para proteger endpoints que requieren sesion valida (SDD-002-AUTH-RBAC).
 * [I/O]: Intercepta la peticion HTTP y valida la presencia de un JWT valido.
 * [Edge Cases]: Genera respuesta 401 Unauthorized uniforme si el token es invalido o esta expirado.
 */

import { Injectable, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Guard global/modular para proteger endpoints que requieren sesion valida.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Inicializa el guard con el reflector de metadatos opcional.
   * @param reflector Reflector inyectado por NestJS.
   */
  constructor(private readonly reflector?: Reflector) {
    super();
  }

  /**
   * Determina si la ruta puede ejecutarse evaluando si está marcada con @Public().
   * @param context Contexto de ejecución de la petición.
   * @returns true si es pública o si la validación JWT resulta exitosa.
   */
  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        return true;
      }
    }
    return super.canActivate(context);
  }

  /**
   * Manejo personalizado de la respuesta de autorizacion.
   * @param err Error generado por Passport.
   * @param user Usuario validado o false.
   * @param info Informacion adicional del error de verificacion.
   * @returns Entidad User validada.
   */
  override handleRequest<TUser = unknown>(err: unknown, user: unknown, info: unknown): TUser {
    if (err || !user) {
      const message = info instanceof Error ? info.message : 'Acceso no autorizado: token requerido';
      throw err || new UnauthorizedException(message);
    }
    return user as TUser;
  }
}

