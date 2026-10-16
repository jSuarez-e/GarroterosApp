/**
 * @sdd
 * [Objetivo]: Decorador para extraer el usuario autenticado desde el objeto Request (SDD-002-AUTH-RBAC).
 * [I/O]: Entrada: ExecutionContext. Salida: Entidad User o propiedad especifica.
 * [Edge Cases]: Retorna undefined de forma segura si la peticion no cuenta con usuario adjunto.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity.js';

/**
 * Decorador para obtener el usuario autenticado inyectado por JwtStrategy.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ /**
     *
     */
    user?: User }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
