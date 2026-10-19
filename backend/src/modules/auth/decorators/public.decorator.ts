/**
 * @sdd
 * [Objetivo]: Decorador para marcar endpoints publicos que omiten JwtAuthGuard (SDD-002-AUTH-RBAC).
 * [I/O]: Aplica metadata IS_PUBLIC_KEY = true sobre handlers o clases de controladores.
 * [Edge Cases]: Permite acceso no autenticado a recursos multimedia y reproduccion de audio HTML5.
 */

import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorador para marcar rutas publicas exentas de validacion JWT.
 * @returns Decorador personalizado de NestJS.
 */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
