/**
 * @sdd
 * [Objetivo]: Guard de autorizacion RBAC basado en roles (SDD-002-AUTH-RBAC).
 * [I/O]: Entrada: ExecutionContext y metadatos de roles. Salida: boolean o excepcion 403 Forbidden.
 * [Edge Cases]: Permite paso libre si el endpoint no tiene decorador @Roles, bloquea si el rol del usuario no coincide.
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { UserRole, User } from '../../users/entities/user.entity.js';

/**
 *
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   *
   * @param reflector
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determina si el usuario autenticado posee al menos uno de los roles autorizados.
   * @param context Contexto de ejecucion de la peticion HTTP.
   * @returns true si tiene permiso.
   * @throws ForbiddenException si el rol no coincide.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ /**
     *
     */
    user?: User }>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Acceso restringido: no se encontro el rol del usuario');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado: se requiere uno de los roles [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
