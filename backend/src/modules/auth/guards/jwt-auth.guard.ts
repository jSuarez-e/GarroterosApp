/**
 * @sdd
 * [Objetivo]: Guard global/modular para proteger endpoints que requieren sesion valida (SDD-002-AUTH-RBAC).
 * [I/O]: Intercepta la peticion HTTP y valida la presencia de un JWT valido.
 * [Edge Cases]: Genera respuesta 401 Unauthorized uniforme si el token es invalido o esta expirado.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 *
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
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
